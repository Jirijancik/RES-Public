export const contact = {
  email: "hello@gtdn.online",
  phone: "+420123456789",
  address: "Moravská 854/2, Doubravka, 31200 Plzeň",
};

export function formatPhoneNumber(phone: string): string {
  return phone.replace(/(\d{3})(\d{3})(\d{3})(\d{3})/, "$1 $2 $3 $4");
}
