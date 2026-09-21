import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AnalystLayout({
  children,
}: LayoutProps<"/analyst">) {
  const session = await auth();
  if (!session) {
    redirect("/login?callbackUrl=/analyst");
  }

  return <>{children}</>;
}
