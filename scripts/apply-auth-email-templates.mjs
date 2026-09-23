import fs from 'node:fs/promises';
import path from 'node:path';

const PROJECT_REF=process.env.SUPABASE_PROJECT_REF||'nohiktjbysfkhtiqdbjy';
const ACCESS_TOKEN=process.env.SUPABASE_ACCESS_TOKEN;
if(!ACCESS_TOKEN)throw new Error('SUPABASE_ACCESS_TOKEN is required');

const root=process.cwd();
const read=(name)=>fs.readFile(path.join(root,'supabase','templates',name),'utf8');

const [
  confirmation,recovery,magicLink,invite,emailChange,reauthentication
]=await Promise.all([
  read('confirmation.html'),
  read('recovery.html'),
  read('magic_link.html'),
  read('invite.html'),
  read('email_change.html'),
  read('reauthentication.html'),
]);

const PRODUCTION_REDIRECT='https://velcoregames.com/duck-heist';

const payload={
  site_url:PRODUCTION_REDIRECT,
  uri_allow_list:PRODUCTION_REDIRECT,
  mailer_subjects_confirmation:'Confirma tu correo | Velcore Games',
  mailer_templates_confirmation_content:confirmation,
  mailer_subjects_recovery:'Recupera tu acceso | Velcore Games',
  mailer_templates_recovery_content:recovery,
  mailer_subjects_magic_link:'Tu acceso seguro | Velcore Games',
  mailer_templates_magic_link_content:magicLink,
  mailer_subjects_invite:'Tu invitación | Velcore Games',
  mailer_templates_invite_content:invite,
  mailer_subjects_email_change:'Confirma tu nuevo correo | Velcore Games',
  mailer_templates_email_change_content:emailChange,
  mailer_subjects_reauthentication:'{{ .Token }} es tu código | Velcore Games',
  mailer_templates_reauthentication_content:reauthentication,
};

const res=await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,{
  method:'PATCH',
  headers:{
    Authorization:`Bearer ${ACCESS_TOKEN}`,
    'Content-Type':'application/json',
  },
  body:JSON.stringify(payload),
});
const text=await res.text();
if(!res.ok)throw new Error(`Supabase Management API ${res.status}: ${text}`);
const result=text?JSON.parse(text):{};
console.log(JSON.stringify({
  applied:true,
  project:PROJECT_REF,
  subjects:{
    confirmation:result.mailer_subjects_confirmation||payload.mailer_subjects_confirmation,
    recovery:result.mailer_subjects_recovery||payload.mailer_subjects_recovery,
    emailChange:result.mailer_subjects_email_change||payload.mailer_subjects_email_change,
  },
},null,2));


const verifyRes=await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,{
  headers:{Authorization:`Bearer ${ACCESS_TOKEN}`},
});
if(!verifyRes.ok)throw new Error(`Supabase verification failed ${verifyRes.status}: ${await verifyRes.text()}`);
const verify=await verifyRes.json();
const hostedConfirmation=String(verify.mailer_templates_confirmation_content||'');
const hostedRecovery=String(verify.mailer_templates_recovery_content||'');
const checks={
  confirmationSubject:verify.mailer_subjects_confirmation==='Confirma tu correo | Velcore Games',
  recoverySubject:verify.mailer_subjects_recovery==='Recupera tu acceso | Velcore Games',
  emailChangeSubject:verify.mailer_subjects_email_change==='Confirma tu nuevo correo | Velcore Games',
  siteUrl:verify.site_url===PRODUCTION_REDIRECT,
  redirectAllowList:String(verify.uri_allow_list||'').split(',').map(v=>v.trim()).includes(PRODUCTION_REDIRECT),
  confirmationBranding:hostedConfirmation.includes('VELCORE GAMES')&&hostedConfirmation.includes('GAMES ID')&&hostedConfirmation.includes('CONFIRMAR CORREO'),
  recoveryBranding:hostedRecovery.includes('Velcore Games')&&hostedRecovery.includes('CAMBIAR CONTRASEÑA'),
  agencyReferenceRemoved:!hostedConfirmation.includes('PARTE DEL ECOSISTEMA VELCORE'),
  genericSupabaseBrandingRemoved:!/powered by supabase|supabase auth/i.test(hostedConfirmation),
};
console.log(JSON.stringify({verified:true,checks},null,2));
if(Object.values(checks).some(v=>v!==true))throw new Error('Hosted Velcore Games email verification failed');
