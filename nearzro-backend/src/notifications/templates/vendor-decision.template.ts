export function vendorDecisionTemplate(data: {
  approved: boolean;
  vendorName?: string;
}) {
  return {
    title: data.approved
      ? 'Vendor Approved'
      : 'Vendor Rejected',
    message: data.approved
      ? `🎉 ${data.vendorName ?? 'Vendor'} has been approved`
      : `❌ ${data.vendorName ?? 'Vendor'} has been rejected`,
  };
}
