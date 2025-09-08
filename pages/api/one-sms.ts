import type { NextApiRequest, NextApiResponse } from 'next';
import { clientApi } from './clients/clientApi';

// URL shortening function with multiple providers (prioritizing free unlimited services)

interface SMSResult {
  mobile: string;
  name: string;
  success: boolean;
  error?: string;
  messageId?: string;
}

interface BulkSMSResponse {
  totalClients: number;
  successCount: number;
  failureCount: number;
  results: SMSResult[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BulkSMSResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const clients = await clientApi.getAllClientsForSMS();
    
    if (!clients || clients.length === 0) {
      return res.status(200).json({
        totalClients: 0,
        successCount: 0,
        failureCount: 0,
        results: []
      });
    }

    const results: SMSResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    const baseUrl = 'https://betapresko.vercel.app';
    

    for (const client of clients) {
      try {
        if (!client.mobile || !client.qr_code) {
          results.push({
            mobile: client.mobile || 'N/A',
            name: client.name || 'Unknown',
            success: false,
            error: 'Missing mobile number or QR code'
          });
          failureCount++;
          continue;
        }

        const newUrl = `https://presko-web.github.io/client-portal/new_experience.html?customerid=${client.id}`;
        // Generate original profile link
        const originalProfileLink = `${baseUrl}/${client.qr_code}`;
        
        // Shorten URL using multiple providers with automatic fallback
        // const profileLink = await shortenUrl(originalProfileLink);

        // Enhanced SMS message with better formatting for iOS compatibility
        const smsMessage = `Hi ${client.name || 'Valued Customer'},

Good news! Your Presko account is now on our new website.

Access it here: ${newUrl}

New features:
• Multi-location support (Home, Office, Shop, etc.)
• Track cleaning per device
• Name your devices & locations (John AC, Reception, Pet Store, etc.)
• Download invoices (PDF)
• Share on Facebook & earn points faster`;

        // Send SMS directly to Semaphore API
        const apikey = process.env.SEMAPHORE_API_KEY!;
        const sendername = process.env.SEMAPHORE_SENDER_NAME || "SEMAPHORE";
        
        const url = "https://api.semaphore.co/api/v4/messages";
        const params = new URLSearchParams({
          apikey: String(apikey),
          number: String(client.mobile),
          message: String(smsMessage),
          sendername: String(sendername),
          type: 'normal'
        });

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        });

        const responseData = await response.text();
        console.log("📡 Semaphore response:", responseData);

        // Handle success/failure
        if (response.ok) {
          results.push({
            mobile: client.mobile,
            name: client.name || 'Unknown',
            success: true,
            messageId: 'sent'
          });
          successCount++;
        } else {
          results.push({
            mobile: client.mobile,
            name: client.name || 'Unknown',
            success: false,
            error: responseData || 'SMS sending failed'
          });
          failureCount++;
        }

        // Delay between SMS sends
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        results.push({
          mobile: client.mobile || 'N/A',
          name: client.name || 'Unknown',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failureCount++;
      }
    }

    return res.status(200).json({
      totalClients: clients.length,
      successCount,
      failureCount,
      results
    });

  } catch (error) {
    console.error('Error in bulk SMS operation:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Server error occurred' 
    });
  }
}