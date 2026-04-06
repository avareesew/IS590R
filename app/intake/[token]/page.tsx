import { getSql } from "@/lib/db";
import IntakeForm from "./IntakeForm";

export default async function IntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const sql = getSql();

  const rows = await sql`
    SELECT client_name, status FROM intake_tokens WHERE token = ${token}
  `;

  if (rows.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Replay</p>
          <h1 className="text-2xl font-bold tracking-tight text-black">Link not found</h1>
          <p className="text-sm text-gray-500">
            This intake link is invalid. Please contact your Replay representative.
          </p>
        </div>
      </div>
    );
  }

  const { client_name: clientName, status } = rows[0];

  if (status === "submitted") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Replay</p>
          <h1 className="text-2xl font-bold tracking-tight text-black">Already submitted</h1>
          <p className="text-sm text-gray-500">
            We already received your materials for <strong>{clientName}</strong>.
            Your Replay representative will be in touch soon.
          </p>
        </div>
      </div>
    );
  }

  return <IntakeForm token={token} clientName={clientName} />;
}
