// kyc-decision.template.ts
export function kycDecisionTemplate(data: any) {
  const isApproved = data.status === 'VERIFIED';
  return {
    title: isApproved ? '✅ KYC Verified' : '❌ KYC Rejected',
    message: isApproved 
      ? `Your KYC document (${data.docType}) has been successfully verified. You now have full access to platform features.`
      : `Your KYC document was rejected. Reason: ${data.rejectionReason || 'Please contact support.'}. Please resubmit with correct details.`,
    deepLink: `/dashboard/${data.role?.toLowerCase()}/kyc`,
  };
}
