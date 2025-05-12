import ButtonAccount from "@/components/ButtonAccount";
import ButtonCheckout from "@/components/ButtonCheckout";
import UnityPlayer from "@/components/UnityPlayer";
import config from "@/config";
import { createClient } from "@/libs/supabase/server";

export const dynamic = "force-dynamic";

// This is a private page: It's protected by the layout.js component which ensures the user is authenticated.
// It's a server compoment which means you can fetch data (like the user profile) before the page is rendered.
// See https://shipfa.st/docs/tutorials/private-page
export default async function Dashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("has_access")
    .eq("id", user.id)
    .single();
  const hasAccess = profile?.has_access === true;

  return (
    <main className="min-h-screen p-8 pb-24">
      <section className="max-w-screen-2xl mx-auto space-y-8">
        <ButtonAccount />
        <h1 className="text-3xl md:text-4xl font-extrabold">Private Page</h1>
        {hasAccess ? (
          <UnityPlayer
            buildFileName="ATSA_Prep_Web_Build"
            buildPath="/Build"
            maintainAspectRatio={true}
            productName="ATSA Prep"
            responsive={true}
            title="ATSA Prep App"
          />
        ) : (
          <div className="bg-gray-100 p-8 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-4">
              Subscribe to Access ATSA Prep
            </h2>
            <p className="mb-6">
              Please subscribe to get immediate access to the ATSA Prep
              application.
            </p>
            <ButtonCheckout
              mode="subscription"
              priceId={config.stripe.plans[0].priceId}
            />
          </div>
        )}
      </section>
    </main>
  );
}
