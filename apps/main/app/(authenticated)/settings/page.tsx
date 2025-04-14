import { EmailManager } from "@/components/email-manager";

export default function EmailsPage() {
  return (
    <div className="container py-12">
      <h1 className="text-2xl font-bold mb-8">Email Management</h1>
      <EmailManager />
    </div>
  );
} 