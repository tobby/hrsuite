import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.mailgun.org",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || "people@dojah.services";

async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[Email] SMTP not configured, skipping email to", to);
    return;
  }
  try {
    await transporter.sendMail({
      from: `HRFlow <${FROM}>`,
      to,
      subject,
      html,
    });
    console.log(`[Email] Sent to ${to}: ${subject}`);
  } catch (error) {
    console.error(`[Email] Failed to send to ${to}:`, error);
  }
}

function wrap(body: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
        <h2 style="margin: 0; color: #2563eb; font-size: 20px;">HRFlow</h2>
      </div>
      ${body}
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
        <p>This is an automated notification from HRFlow. Please do not reply to this email.</p>
      </div>
    </div>
  `;
}

// ==================== INVITE ====================

export async function sendInviteEmail(to: string, employeeName: string, inviteLink: string) {
  await sendEmail(to, "You've been invited to HRFlow", wrap(`
    <h3 style="color: #111827;">Welcome to the team, ${employeeName}!</h3>
    <p>You've been invited to join HRFlow. Click the link below to set up your account:</p>
    <div style="margin: 24px 0;">
      <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Set Up Your Account</a>
    </div>
    <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link: ${inviteLink}</p>
  `));
}

// ==================== LEAVE ====================

export async function sendLeaveRequestNotification(managerEmail: string, managerName: string, employeeName: string, leaveType: string, startDate: string, endDate: string) {
  await sendEmail(managerEmail, `New Leave Request from ${employeeName}`, wrap(`
    <h3 style="color: #111827;">New Leave Request</h3>
    <p>Hi ${managerName},</p>
    <p><strong>${employeeName}</strong> has submitted a leave request that requires your review.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Leave Type</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${leaveType}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Start Date</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${startDate}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">End Date</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${endDate}</td></tr>
    </table>
    <p>Please log in to HRFlow to review this request.</p>
  `));
}

export async function sendLeaveApprovedEmail(to: string, employeeName: string, leaveType: string, startDate: string, endDate: string, stage: string) {
  const stageText = stage === "manager" ? "approved by your manager" : "fully approved";
  await sendEmail(to, `Leave Request ${stage === "manager" ? "Manager Approved" : "Approved"}`, wrap(`
    <h3 style="color: #111827;">Leave Request ${stageText.charAt(0).toUpperCase() + stageText.slice(1)}</h3>
    <p>Hi ${employeeName},</p>
    <p>Your leave request has been <strong>${stageText}</strong>.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Leave Type</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${leaveType}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Start Date</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${startDate}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">End Date</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${endDate}</td></tr>
    </table>
  `));
}

export async function sendLeaveRejectedEmail(to: string, employeeName: string, leaveType: string, comment: string) {
  await sendEmail(to, "Leave Request Rejected", wrap(`
    <h3 style="color: #111827;">Leave Request Rejected</h3>
    <p>Hi ${employeeName},</p>
    <p>Unfortunately, your <strong>${leaveType}</strong> leave request has been rejected.</p>
    ${comment ? `<div style="background: #f3f4f6; border-left: 3px solid #ef4444; padding: 12px; margin: 16px 0; border-radius: 4px;"><p style="margin: 0; color: #374151;"><strong>Reason:</strong> ${comment}</p></div>` : ""}
    <p>Please log in to HRFlow for more details or to submit a new request.</p>
  `));
}

// ==================== L&D ====================

export async function sendLdRequestNotification(toEmail: string, toName: string, employeeName: string, courseTitle: string, provider: string) {
  await sendEmail(toEmail, `New L&D Request from ${employeeName}`, wrap(`
    <h3 style="color: #111827;">New Learning & Development Request</h3>
    <p>Hi ${toName},</p>
    <p><strong>${employeeName}</strong> has submitted an L&D request that requires your review.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Course</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${courseTitle}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Provider</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${provider}</td></tr>
    </table>
    <p>Please log in to HRFlow to review this request.</p>
  `));
}

export async function sendLdManagerApprovedToAdmin(adminEmail: string, adminName: string, employeeName: string, courseTitle: string) {
  await sendEmail(adminEmail, `L&D Request Manager Approved — ${employeeName}`, wrap(`
    <h3 style="color: #111827;">L&D Request Awaiting Your Review</h3>
    <p>Hi ${adminName},</p>
    <p>An L&D request from <strong>${employeeName}</strong> has been approved by their manager and is now awaiting your assignment.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Course</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${courseTitle}</td></tr>
    </table>
    <p>Please log in to HRFlow to review and assign this request.</p>
  `));
}

export async function sendLdApprovedEmail(to: string, employeeName: string, courseTitle: string, stage: string) {
  const stageText = stage === "manager" ? "approved by your manager" : "fully approved";
  await sendEmail(to, `L&D Request ${stage === "manager" ? "Manager Approved" : "Approved"}`, wrap(`
    <h3 style="color: #111827;">L&D Request ${stageText.charAt(0).toUpperCase() + stageText.slice(1)}</h3>
    <p>Hi ${employeeName},</p>
    <p>Your L&D request for <strong>${courseTitle}</strong> has been <strong>${stageText}</strong>.</p>
  `));
}

export async function sendLdRejectedEmail(to: string, employeeName: string, courseTitle: string, comment: string) {
  await sendEmail(to, "L&D Request Rejected", wrap(`
    <h3 style="color: #111827;">L&D Request Rejected</h3>
    <p>Hi ${employeeName},</p>
    <p>Your L&D request for <strong>${courseTitle}</strong> has been rejected.</p>
    ${comment ? `<div style="background: #f3f4f6; border-left: 3px solid #ef4444; padding: 12px; margin: 16px 0; border-radius: 4px;"><p style="margin: 0; color: #374151;"><strong>Reason:</strong> ${comment}</p></div>` : ""}
  `));
}

export async function sendLdAssignedEmail(to: string, assigneeName: string, employeeName: string, courseTitle: string) {
  await sendEmail(to, `L&D Request Assigned to You — ${courseTitle}`, wrap(`
    <h3 style="color: #111827;">L&D Request Assigned to You</h3>
    <p>Hi ${assigneeName},</p>
    <p>An L&D request from <strong>${employeeName}</strong> has been assigned to you.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Course</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${courseTitle}</td></tr>
    </table>
    <p>Please log in to HRFlow to view the details.</p>
  `));
}

// ==================== LOANS ====================

export async function sendLoanRequestNotification(adminEmail: string, adminName: string, employeeName: string, amount: string, purpose: string) {
  await sendEmail(adminEmail, `New Loan Request from ${employeeName}`, wrap(`
    <h3 style="color: #111827;">New Loan Request</h3>
    <p>Hi ${adminName},</p>
    <p><strong>${employeeName}</strong> has submitted a loan request that requires your review.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Purpose</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${purpose}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Amount</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${amount}</td></tr>
    </table>
    <p>Please log in to HRFlow to review this request.</p>
  `));
}

export async function sendLoanApprovedEmail(to: string, employeeName: string, amount: string, purpose: string) {
  await sendEmail(to, "Loan Request Approved", wrap(`
    <h3 style="color: #111827;">Loan Request Approved</h3>
    <p>Hi ${employeeName},</p>
    <p>Your loan request has been <strong>approved</strong>.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Purpose</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${purpose}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Amount</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${amount}</td></tr>
    </table>
  `));
}

export async function sendLoanRejectedEmail(to: string, employeeName: string, purpose: string, comment: string) {
  await sendEmail(to, "Loan Request Rejected", wrap(`
    <h3 style="color: #111827;">Loan Request Rejected</h3>
    <p>Hi ${employeeName},</p>
    <p>Your loan request for <strong>${purpose}</strong> has been rejected.</p>
    ${comment ? `<div style="background: #f3f4f6; border-left: 3px solid #ef4444; padding: 12px; margin: 16px 0; border-radius: 4px;"><p style="margin: 0; color: #374151;"><strong>Reason:</strong> ${comment}</p></div>` : ""}
  `));
}

export async function sendLoanAssignedEmail(to: string, assigneeName: string, employeeName: string, purpose: string, amount: string) {
  await sendEmail(to, `Loan Request Assigned to You`, wrap(`
    <h3 style="color: #111827;">Loan Request Assigned to You</h3>
    <p>Hi ${assigneeName},</p>
    <p>A loan request from <strong>${employeeName}</strong> has been assigned to you.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Purpose</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${purpose}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Amount</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${amount}</td></tr>
    </table>
    <p>Please log in to HRFlow to view the details.</p>
  `));
}

// ==================== APPRAISALS ====================

export async function sendAppraisalAssignedEmail(to: string, employeeName: string, cycleName: string) {
  await sendEmail(to, `New Appraisal Assigned — ${cycleName}`, wrap(`
    <h3 style="color: #111827;">New Appraisal Assigned</h3>
    <p>Hi ${employeeName},</p>
    <p>You have been assigned a new performance appraisal for the <strong>${cycleName}</strong> cycle.</p>
    <p>Please log in to HRFlow to complete your self-review.</p>
  `));
}

export async function sendAppraisalSelfReviewCompleteEmail(managerEmail: string, managerName: string, employeeName: string, cycleName: string) {
  await sendEmail(managerEmail, `Self-Review Completed — ${employeeName}`, wrap(`
    <h3 style="color: #111827;">Self-Review Completed</h3>
    <p>Hi ${managerName},</p>
    <p><strong>${employeeName}</strong> has completed their self-review for the <strong>${cycleName}</strong> appraisal cycle.</p>
    <p>Please log in to HRFlow to review and provide your assessment.</p>
  `));
}

export async function sendAppraisalCompletedEmail(to: string, employeeName: string, cycleName: string) {
  await sendEmail(to, `Appraisal Results Available — ${cycleName}`, wrap(`
    <h3 style="color: #111827;">Appraisal Results Available</h3>
    <p>Hi ${employeeName},</p>
    <p>Your performance appraisal for the <strong>${cycleName}</strong> cycle has been completed. Your results are now available.</p>
    <p>Please log in to HRFlow to view your results.</p>
  `));
}

// ==================== QUERIES ====================

export async function sendQueryRaisedEmail(to: string, employeeName: string, subject: string) {
  await sendEmail(to, `Disciplinary Query Raised — ${subject}`, wrap(`
    <h3 style="color: #111827;">Disciplinary Query Raised</h3>
    <p>Hi ${employeeName},</p>
    <p>A disciplinary query has been raised regarding: <strong>${subject}</strong>.</p>
    <p>Please log in to HRFlow to view the details and respond.</p>
  `));
}

export async function sendQueryStatusUpdateEmail(to: string, employeeName: string, subject: string, newStatus: string) {
  await sendEmail(to, `Query Update — ${subject}`, wrap(`
    <h3 style="color: #111827;">Query Status Updated</h3>
    <p>Hi ${employeeName},</p>
    <p>The status of your query <strong>${subject}</strong> has been updated to: <strong>${newStatus.replace(/_/g, " ")}</strong>.</p>
    <p>Please log in to HRFlow to view the details.</p>
  `));
}

// ==================== TASKS ====================

export async function sendTaskAssignedEmail(to: string, employeeName: string, taskTitle: string) {
  await sendEmail(to, `New Task Assigned — ${taskTitle}`, wrap(`
    <h3 style="color: #111827;">New Task Assigned</h3>
    <p>Hi ${employeeName},</p>
    <p>A new task has been assigned to you: <strong>${taskTitle}</strong>.</p>
    <p>Please log in to HRFlow to view and complete this task.</p>
  `));
}

export async function sendTaskCompletedEmail(to: string, managerName: string, employeeName: string, taskTitle: string) {
  await sendEmail(to, `Task Completed — ${employeeName}`, wrap(`
    <h3 style="color: #111827;">Task Completed</h3>
    <p>Hi ${managerName},</p>
    <p><strong>${employeeName}</strong> has completed the task: <strong>${taskTitle}</strong>.</p>
    <p>Please log in to HRFlow to review.</p>
  `));
}
