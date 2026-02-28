import pytest
from company.models import Company


@pytest.mark.django_db
class TestCompanyModel:
    def test_create_company(self):
        company = Company.objects.create(
            ico="12345678",
            name="Test s.r.o.",
        )
        assert company.ico == "12345678"
        assert company.name == "Test s.r.o."
        assert company.is_active is True
        assert company.created_at is not None
        assert company.updated_at is not None

    def test_ico_unique(self):
        Company.objects.create(ico="12345678", name="First")
        with pytest.raises(Exception):
            Company.objects.create(ico="12345678", name="Second")

    def test_str_representation(self):
        company = Company.objects.create(ico="12345678", name="Test s.r.o.")
        assert str(company) == "Test s.r.o. (12345678)"
