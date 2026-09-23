import fs from 'node:fs/promises';
import path from 'node:path';

const PROJECT_REF=process.env.SUPABASE_PROJECT_REF||'nohiktjbysfkhtiqdbjy';
const ACCESS_TOKEN=process.env.SUPABASE_ACCESS_TOKEN;
if(!ACCESS_TOKEN)throw new Error('SUPABASE_ACCESS_TOKEN is required');

const root=process.cwd();
const read=(name)=>fs.readFile(path.join(root,'supabase','templates',name),'utf8');

const [
  confirmation,recovery,magicLink,invite,emailChange,reauthentication,
  passwordChanged,emailChanged
]=await Promise.all([
  read('confirmation.html'),
  read('recovery.html'),
  read('magic_link.html'),
  read('invite.html'),
  read('email_change.html'),
  read('reauthentication.html'),
  read('password_changed_notification.html'),
  read('email_changed_notification.html'),
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
  mailer_notifications_password_changed_enabled:true,
  mailer_subjects_password_changed_notification:'Tu contraseña cambió | Velcore Games',
  mailer_templates_password_changed_notification_content:passwordChanged,
  mailer_notifications_email_changed_enabled:true,
  mailer_subjects_email_changed_notification:'Tu correo cambió | Velcore Games',
  mailer_templates_email_changed_notification_content:emailChanged,
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
    passwordChanged:result.mailer_subjects_password_changed_notification||payload.mailer_subjects_password_changed_notification,
    emailChanged:result.mailer_subjects_email_changed_notification||payload.mailer_subjects_email_changed_notification,
  },
},null,2));


const verifyRes=await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,{
  headers:{Authorization:`Bearer ${ACCESS_TOKEN}`},
});
if(!verifyRes.ok)throw new Error(`Supabase verification failed ${verifyRes.status}: ${await verifyRes.text()}`);
const verify=await verifyRes.json();
const hostedConfirmation=String(verify.mailer_templates_confirmation_content||'');
const hostedRecovery=String(verify.mailer_templates_recovery_content||'');
const hostedPasswordChanged=String(verify.mailer_templates_password_changed_notification_content||'');
const hostedEmailChanged=String(verify.mailer_templates_email_changed_notification_content||'');
const palette=['#0A1B5E','#1E3DFF','#00A8FF','#8B5CF6','#D946EF','#F3F4F8','#0F172A'];
const checks={
  confirmationSubject:verify.mailer_subjects_confirmation==='Confirma tu correo | Velcore Games',
  recoverySubject:verify.mailer_subjects_recovery==='Recupera tu acceso | Velcore Games',
  emailChangeSubject:verify.mailer_subjects_email_change==='Confirma tu nuevo correo | Velcore Games',
  passwordChangedSubject:verify.mailer_subjects_password_changed_notification==='Tu contraseña cambió | Velcore Games',
  emailChangedSubject:verify.mailer_subjects_email_changed_notification==='Tu correo cambió | Velcore Games',
  passwordChangedNotification:verify.mailer_notifications_password_changed_enabled===true&&hostedPasswordChanged.includes('VELCORE GAMES'),
  emailChangedNotification:verify.mailer_notifications_email_changed_enabled===true&&hostedEmailChanged.includes('VELCORE GAMES'),
  siteUrl:verify.site_url===PRODUCTION_REDIRECT,
  redirectAllowList:String(verify.uri_allow_list||'').split(',').map(v=>v.trim()).includes(PRODUCTION_REDIRECT),
  confirmationBranding:hostedConfirmation.includes('VELCORE GAMES')&&hostedConfirmation.includes('GAMES ID')&&hostedConfirmation.includes('CONFIRMAR CORREO'),
  recoveryBranding:hostedRecovery.includes('Velcore Games')&&hostedRecovery.includes('CAMBIAR CONTRASEÑA'),
  agencyReferenceRemoved:!hostedConfirmation.includes('PARTE DEL ECOSISTEMA VELCORE'),
  genericSupabaseBrandingRemoved:!/powered by supabase|supabase auth/i.test(hostedConfirmation),
  paletteApplied:palette.every(color=>hostedConfirmation.includes(color)),
};
console.log(JSON.stringify({verified:true,checks},null,2));
if(Object.values(checks).some(v=>v!==true))throw new Error('Hosted Velcore Games email verification failed');
