import { readFile } from 'node:fs/promises';

const [feed, auth] = await Promise.all([
  readFile(new URL('../home-feed.js', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/auth.js', import.meta.url), 'utf8')
]);

const start = feed.indexOf("async function publishPost(alsoStory=false)");
const end = feed.indexOf("form.addEventListener('submit',event=>{event.preventDefault();publishPost(false);});", start);
const submit = start >= 0 && end > start ? feed.slice(start, end) : '';
const checks = [
  ['feed submission keeps created post and uploaded path for rollback', submit.includes('let createdPost=null,uploadedPaths=[],feedPublished=false,publishStage=')],
  ['post is created before media upload', submit.indexOf('createdPost=await submitMyPost(') >= 0 && submit.indexOf(".upload(path,file") > submit.indexOf('createdPost=await submitMyPost(')],
  ['upload error aborts before media row insert', submit.includes('if(uploaded.error)throw uploaded.error;')],
  ['post_media insert failure aborts publication', submit.includes("supabase.from('post_media').insert(") && submit.includes('if(row.error)throw row.error;')],
  ['uploaded orphan file is removed after failure', submit.includes("storage.from('capital-do-trem-social').remove(uploadedPaths)")],
  ['rollback cleanup errors are caught and logged without hiding original error', submit.includes('catch(cleanupError){console.error') && submit.includes("status.textContent='Falha ao '+publishStage+': '")],
  ['incomplete post is deleted after upload or attachment failure', submit.includes('if(createdPost?.id){try{await deleteMyPost(createdPost.id);}')],
  ['submit button is restored after success or failure', submit.includes('finally{button.disabled=false;if(storyPublishButton)storyPublishButton.disabled=!selectedFiles.length||selectedFiles.length!==1;}')],
  ['post deletion function exists in Supabase module', auth.includes('export async function deleteMyPost(')],
  ['file type and size limits remain enforced before upload', feed.includes("!['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'].includes(file.type)") && submit.includes("file.type.startsWith('image/')?10*1024*1024:50*1024*1024")]
];

for (const [name, ok] of checks) console.log((ok ? 'OK  ' : 'ERRO') + ' ' + name);
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) process.exit(1);
console.log('Rollback de publicações incompletas validado: ' + checks.length + ' verificações.');
