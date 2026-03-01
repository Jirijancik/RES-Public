"""
Company hub business logic — unified lookup across data sources.
"""
from core.exceptions import ExternalAPIError
from core.services.cache import CacheService
from .models import Company

COMPANY_DETAIL_CACHE_TTL = 900  # 15 minutes


class CompanyService:
    def __init__(self):
        self.cache = CacheService(prefix="company", default_ttl=COMPANY_DETAIL_CACHE_TTL)

    def get_by_ico(self, ico: str) -> dict:
        """Return unified company data from all linked sources."""
        normalized = ico.zfill(8)

        cached = self.cache.get("detail", normalized)
        if cached is not None:
            return cached

        try:
            company = Company.objects.get(ico=normalized)
        except Company.DoesNotExist:
            raise ExternalAPIError(
                "Company not found.", status_code=404, service_name="company"
            )

        # Justice data
        justice_entity = (
            company.justice_entities
            .order_by("-updated_at")
            .first()
        )
        justice_data = None
        if justice_entity:
            justice_data = {
                "ico": justice_entity.ico,
                "name": justice_entity.name,
                "legalFormCode": justice_entity.legal_form_code,
                "legalFormName": justice_entity.legal_form_name,
                "courtName": justice_entity.court_name,
                "fileReference": justice_entity.file_reference,
                "registrationDate": (
                    justice_entity.registration_date.isoformat()
                    if justice_entity.registration_date else None
                ),
                "deletionDate": (
                    justice_entity.deletion_date.isoformat()
                    if justice_entity.deletion_date else None
                ),
                "isActive": justice_entity.is_active,
            }

        # ARES data
        ares_record = company.ares_records.first()
        ares_data = None
        if ares_record and ares_record.raw_data:
            ares_data = ares_record.raw_data

        result = {
            "ico": company.ico,
            "name": company.name,
            "isActive": company.is_active,
            "sources": {
                "justice": justice_data,
                "ares": ares_data,
            },
            "createdAt": company.created_at.isoformat(),
            "updatedAt": company.updated_at.isoformat(),
        }

        self.cache.set(result, "detail", normalized, ttl=COMPANY_DETAIL_CACHE_TTL)
        return result

    def search(self, params: dict) -> dict:
        """Multi-parameter search across denormalized Company fields."""
        qs = Company.objects.all()

        if ico := params.get("ico"):
            qs = qs.filter(ico=ico.zfill(8))
        if name := params.get("name"):
            qs = qs.filter(name__icontains=name)
        if legal_form := params.get("legalForm"):
            qs = qs.filter(legal_form=legal_form)
        if region_code := params.get("regionCode"):
            qs = qs.filter(region_code=region_code)
        if employee_cat := params.get("employeeCategory"):
            qs = qs.filter(employee_category=employee_cat)
        if revenue_min := params.get("revenueMin"):
            qs = qs.filter(latest_revenue__gte=revenue_min)
        if revenue_max := params.get("revenueMax"):
            qs = qs.filter(latest_revenue__lte=revenue_max)
        if nace := params.get("nace"):
            qs = qs.filter(nace_primary=nace)
        if params.get("status") == "active":
            qs = qs.filter(is_active=True)
        elif params.get("status") == "inactive":
            qs = qs.filter(is_active=False)

        total = qs.count()
        offset = params.get("offset", 0)
        limit = params.get("limit", 25)
        companies = qs.order_by("-latest_revenue", "name")[offset:offset + limit]

        return {
            "totalCount": total,
            "offset": offset,
            "limit": limit,
            "companies": [
                {
                    "ico": c.ico,
                    "name": c.name,
                    "isActive": c.is_active,
                    "legalForm": c.legal_form,
                    "regionCode": c.region_code,
                    "regionName": c.region_name,
                    "employeeCategory": c.employee_category,
                    "latestRevenue": str(c.latest_revenue) if c.latest_revenue else None,
                    "nacePrimary": c.nace_primary,
                }
                for c in companies
            ],
        }
