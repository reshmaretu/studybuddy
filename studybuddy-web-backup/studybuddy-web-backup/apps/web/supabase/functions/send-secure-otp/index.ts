import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req: Request) => {
    // 1. Handle Preflight for CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body = await req.json()
        const userEmail = body.userEmail || body.email || body.newEmail
        const action = body.action || body.type
        const { userId } = body

        console.log(`[RELAY] Action: ${action}, Email: ${userEmail}, UserID: ${userId}`);

        if (!userEmail) throw new Error("userEmail missing in payload")

        // Validation for environment keys
        const serviceId = Deno.env.get('EMAILJS_SERVICE_ID')
        const publicKey = Deno.env.get('EMAILJS_PUBLIC_KEY')
        const privateKey = Deno.env.get('EMAILJS_PRIVATE_KEY')
        
        if (!serviceId || !publicKey || !privateKey) {
            console.error("[CRITICAL] Missing EmailJS Environment Configuration");
            throw new Error("Relay configuration incomplete. Check environment keys.");
        }

        // ACTION: SEND OTP (for Account Settings)
        if (action === 'send_otp') {
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

            const { error: dbError } = await supabaseAdmin.from('recovery_codes').upsert({
                user_id: userId,
                code: otpCode,
                type: 'verify'
            })

            if (dbError) throw new Error(`Database uplink failed: ${dbError.message}`);

            const templateId = Deno.env.get('EMAILJS_OTP_TEMPLATE_ID')
            if (!templateId) throw new Error("OTP Template ID missing.");

            const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: serviceId,
                    template_id: templateId,
                    user_id: publicKey,
                    accessToken: privateKey,
                    template_params: {
                        email: userEmail,
                        otp_code: otpCode
                    },
                }),
            })

            if (!emailResponse.ok) {
                const errorText = await emailResponse.text();
                console.error("[EMAILJS ERROR]", errorText);
                throw new Error(`Email relay failed: ${errorText}`);
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            })
        }

        // ACTION: RESET PASSWORD (for Login Page)
        if (action === 'reset_password') {
            const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'recovery',
                email: userEmail,
                options: {
                    redirectTo: 'https://studybuddy-repository.vercel.app/reset-password'
                }
            });

            if (linkError) throw linkError;

            const resetTemplateId = Deno.env.get('EMAILJS_RESET_TEMPLATE_ID')
            if (!resetTemplateId) throw new Error("Reset Template ID missing.");

            const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: serviceId,
                    template_id: resetTemplateId,
                    user_id: publicKey,
                    accessToken: privateKey,
                    template_params: {
                        email: userEmail,
                        reset_link: data.properties.action_link
                    },
                }),
            });

            if (!emailResponse.ok) {
                const errorText = await emailResponse.text();
                throw new Error(`Email relay failed: ${errorText}`);
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        throw new Error("Invalid action protocol");

    } catch (err: any) {
        console.error("[RELAY ERROR]", err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})