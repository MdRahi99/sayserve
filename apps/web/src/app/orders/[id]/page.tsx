import { OrderTracking } from "@/components/OrderTracking";

export const metadata = { title: "Tracking your order — SayServe" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderTracking id={id} />;
}
