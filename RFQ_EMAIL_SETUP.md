# RFQ Email System Setup Guide

## Overview
This guide sets up a production-ready RFQ (Request for Quotation) email system that sends professional emails to vendors with BOM part details, processes, and 2D/3D file attachments.

## Features
- ✅ Professional HTML email templates
- ✅ Automatic 2D/3D file attachment
- ✅ BOM part details with processes
- ✅ Vendor-specific personalization
- ✅ Email delivery tracking
- ✅ Industry best practices
- ✅ Production-ready error handling

## Installation Steps

### 1. Backend Dependencies
Install required packages for email functionality:

```bash
cd backend
npm install nodemailer @types/nodemailer handlebars @types/handlebars
```

### 2. Environment Configuration
Add these variables to your `.env` file:

```env
# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@company.com
SMTP_PASS=your_app_password

# Company Information
COMPANY_NAME="Mithran Engineering"
COMPANY_PHONE="+91-XXXXXXXXXX"
BUYER_EMAIL=procurement@company.com
FRONTEND_URL=https://your-domain.com
```

### 3. Database Migration
Run the RFQ email tracking migration:

```bash
# Apply the migration
psql -h your_host -U your_user -d your_db -f migrations/056_rfq_email_tracking.sql
```

### 4. Email Service Setup

#### Option A: Gmail SMTP
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password: Google Account > Security > App passwords
3. Use the App Password as `SMTP_PASS`

#### Option B: SendGrid (Recommended for Production)
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
```

#### Option C: AWS SES
```env
SMTP_HOST=email-smtp.your-region.amazonaws.com
SMTP_PORT=587
SMTP_USER=your_ses_access_key
SMTP_PASS=your_ses_secret_key
```

### 5. Frontend Integration
The RFQ system is already integrated in the supplier evaluation flow. No additional setup required.

## Usage

### 1. Using the Supplier Evaluation System
1. Navigate to Projects > [Your Project] > Supplier Evaluation
2. Select BOM parts you want to quote
3. Select vendors to send RFQ to
4. Click "Send RFQ" button
5. System automatically creates RFQ and sends professional emails

### 2. Email Content Includes
- Professional company branding
- Complete BOM part details with quantities
- Manufacturing processes for each part
- 2D drawings and 3D models as attachments
- Quote deadline and submission instructions
- Contact information
- Terms and conditions

### 3. Tracking and Analytics
- Email delivery status tracking
- Open rate monitoring
- Click tracking
- Vendor response tracking
- Comprehensive RFQ dashboard

## Email Template Features

### Professional Design
- Mobile-responsive HTML template
- Company branding and colors
- Clean, easy-to-read layout
- Industry-standard format

### Comprehensive Content
- RFQ details and reference number
- Complete BOM table with:
  - Part numbers and descriptions
  - Material specifications
  - Required quantities
  - Manufacturing processes
  - File attachment indicators

### Vendor Experience
- Personalized vendor information
- Clear call-to-action buttons
- Online quote submission portal
- Email reply option
- Professional contact details

## Security Features
- Row Level Security (RLS) on email logs
- Sanitized file attachments
- Rate limiting (recommended)
- Email validation
- Secure file access

## Monitoring and Troubleshooting

### Check Email Delivery
```sql
-- View recent RFQ email activity
SELECT 
    r.rfq_number,
    v.name as vendor_name,
    rel.email,
    rel.status,
    rel.sent_at,
    rel.error_message
FROM rfq_email_logs rel
JOIN rfq_records r ON r.id = rel.rfq_id
JOIN vendors v ON v.id = rel.vendor_id
ORDER BY rel.sent_at DESC
LIMIT 50;
```

### Email Statistics
```sql
-- View email performance stats
SELECT * FROM rfq_email_stats 
WHERE rfq_id = 'your-rfq-id';
```

### Common Issues and Solutions

#### 1. SMTP Authentication Failed
- Verify SMTP credentials
- Check if 2FA is enabled (use App Password)
- Verify SMTP host and port

#### 2. Files Not Attaching
- Check file paths in BOM items
- Verify file storage permissions
- Ensure files exist and are accessible

#### 3. Emails Going to Spam
- Set up SPF, DKIM, and DMARC records
- Use a dedicated email service (SendGrid, AWS SES)
- Include proper unsubscribe links

#### 4. Vendor Emails Missing
- Verify vendor email addresses in database
- Check primary_contacts data structure
- Ensure vendors have active status

## Production Recommendations

### 1. Email Service
- Use dedicated email service (SendGrid, AWS SES, Mailgun)
- Set up domain authentication (SPF, DKIM, DMARC)
- Configure dedicated IP for better deliverability

### 2. Monitoring
- Set up email delivery monitoring
- Track bounce rates and spam complaints
- Monitor RFQ response rates

### 3. Performance
- Implement email queue for bulk sending
- Add rate limiting for email API
- Cache email templates

### 4. Compliance
- Include unsubscribe links
- Comply with CAN-SPAM and GDPR
- Maintain email preference management

## API Endpoints

### Send RFQ
```
POST /rfq
PATCH /rfq/{id}/send
```

### Email Statistics
```
GET /rfq/{id}/email-stats
```

## File Structure
```
backend/src/modules/rfq/
├── services/rfq-email.service.ts    # Email service
├── rfq.service.ts                   # Updated with email integration
├── rfq.module.ts                    # Module configuration
└── dto/                             # DTOs and interfaces
```

## Support
For technical support or custom modifications, contact the development team.

---

## Testing the System

### 1. Test Email Configuration
```bash
# Test SMTP connection
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your_email@gmail.com',
    pass: 'your_app_password'
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.log('SMTP Error:', error);
  } else {
    console.log('SMTP Server is ready to send emails');
  }
});
"
```

### 2. Test RFQ Creation
1. Create a test project with BOM items
2. Upload test 2D/3D files
3. Add test vendors with email addresses
4. Send a test RFQ
5. Verify email delivery and content

The system is now ready for production use! 🚀