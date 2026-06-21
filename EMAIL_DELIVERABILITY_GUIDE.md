# 📧 Brevo Email Deliverability & Spam Prevention Guide

This guide explains how to properly configure your domain DNS records and Brevo settings to prevent transactional emails (like OTP verification codes and invoice PDFs) from landing in your users' **Spam** folders.

---

## 📋 The Root Causes of Spam Delivery

When sending emails from a web application via a transactional server like Brevo, receiving mail boxes (such as Gmail, Yahoo, Outlook) perform authentication checks. Your emails will go to Spam if:
1. **You send from a free domain (like `@gmail.com`)**: Google's DMARC policy forbids sending emails claiming to be from `@gmail.com` using external servers like Brevo.
2. **Your domain lacks SPF/DKIM signatures**: The receiving mail server cannot verify that Brevo has permission to send email on behalf of your domain name.

---

## 🛠️ Step 1: Use a Custom Domain Email Address

To pass Gmail and Yahoo’s strict sender requirements, **never** send transactional emails from a free Gmail address (e.g., `sender@gmail.com`). 
- **Requirement**: Use an email address belonging to a custom domain that you own (e.g., `noreply@tronix365.com` or `auth@yourdomain.com`).
- Update your `CONTACT_EMAIL` or sender credentials in the backend `.env` file to use this custom domain email.

---

## ⚙️ Step 2: Configure SPF, DKIM, and DMARC DNS Records

You must add specific text records (TXT) to your Domain Registrar's DNS settings (such as GoDaddy, Namecheap, Cloudflare, Hostinger, etc.).

### 1. SPF (Sender Policy Framework) Record
SPF defines which servers (in this case, Brevo) are allowed to send emails from your domain.

- **Type**: `TXT`
- **Host/Name**: `@` (or leave empty depending on the registrar)
- **Value/Content**: `v=spf1 include:spf.sendinblue.com ~all`

*(Note: If you already have an SPF record for another provider like Google Workspace, merge them together by appending `include:spf.sendinblue.com` before `~all`. Do not create multiple SPF records.)*

### 2. DKIM (DomainKeys Identified Mail) Record
DKIM adds a cryptographic signature to your emails, confirming they were not modified in transit.

- Get the DKIM hostname and key from your Brevo Dashboard (**Senders & IP > Domains > Add a Domain**).
- **Type**: `TXT`
- **Host/Name**: `mail._domainkey` (or similar hostname provided by Brevo)
- **Value/Content**: *[Copy the long text string provided by Brevo starting with `k=rsa; p=...`]*

### 3. DMARC (Domain-based Message Authentication, Reporting, and Conformance) Record
DMARC relies on SPF and DKIM to tell receiving servers what to do if an email fails validation.

- **Type**: `TXT`
- **Host/Name**: `_dmarc`
- **Value/Content**: `v=DMARC1; p=neutral; pct=100; rua=mailto:dmarc-reports@yourdomain.com;`

*(Replace `dmarc-reports@yourdomain.com` with an email address where you want to receive reports, or use `p=none` if you just want to monitor).*

---

## 🌐 Step 3: Authenticate the Domain in Brevo

1. Log in to your **[Brevo Dashboard](https://app.brevo.com/)**.
2. Click on your profile name in the top-right corner and select **Senders, Domains & Dedicated IPs**.
3. Navigate to **Domains** on the left menu.
4. Click **Add a domain** and enter your custom domain name (e.g., `yourdomain.com`).
5. Brevo will show you the exact TXT values for SPF, DKIM, and DMARC.
6. Once you have added the records in your DNS manager, click the **Authenticate** button in Brevo.
7. Wait 5-10 minutes for DNS propagation. Once the status shows a green "Configured" label, authentication is complete.

---

## 💡 Best Practices for Content & Delivery

Even after authenticating your domain, spam filters inspect email bodies. Implement these rules:
- **Include physical footer data**: CAN-SPAM laws require a physical address or contact information in transactional footers.
- **Maintain a clean text-to-HTML ratio**: Do not send emails consisting entirely of a single image or minimal text. Always include normal copy (like security warning notes).
- **Avoid spam-trigger words**: Try not to write subjects in ALL CAPS or use clickbait phrases. Keep the OTP subject simple and direct (e.g., `123456 is your Tronix365 verification code`).
- **Encourage users to mark as "Not Spam"**: If testing, manually mark it as "Not Spam" in Gmail. This helps build your IP address reputation with Google.
