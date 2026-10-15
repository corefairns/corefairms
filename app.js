/* CoreFair: Supabase-backed authentication and posts.
   Configure supabase-config.js and run supabase/schema.sql first.
   This app uses the browser-safe anon/publishable key + database RLS. */
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const configured = window.COREFair_SUPABASE_URL &&
  !window.COREFair_SUPABASE_URL.includes("YOUR_PROJECT_ID") &&
  window.COREFair_SUPABASE_ANON_KEY &&
  !window.COREFair_SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
const supabase = configured && window.supabase
  ? window.supabase.createClient(window.COREFair_SUPABASE_URL, window.COREFair_SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

let session = null;
let currentUser = null;
let currentFilter = 'All';
let currentView = 'home';
let posts = [];
let toastTimer;
const demoPosts = [
  {id:'demo1',author:'CoreFair',handle:'@corefair',age:'Sample post',title:'Welcome to CoreFair — Grow Together!',body:'Connect with businesses, share useful updates, and discover new opportunities. Connect Supabase to load real posts from the community.',category:'Business',likes_count:24,comments_count:5,liked_by_me:false,visual:'brand',is_demo:true},
  {id:'demo2',author:'Digital Store',handle:'@digitalstore',age:'Sample post',title:'Special Offer — Up to 50% Off!',body:'Showcase products and offers to help customers discover what your business has to offer.',category:'Offers',likes_count:36,comments_count:12,liked_by_me:false,visual:'products',is_demo:true},
  {id:'demo3',author:'Business Tips',handle:'@businesstips',age:'Sample post',title:'5 Tips to Grow Your Small Business',body:'Consistency, helpful content, and customer connection can take your business to the next level.',category:'Tips',likes_count:48,comments_count:8,liked_by_me:false,visual:'tips',is_demo:true}
];

function escapeHTML(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function showToast(message){const t=$('#toast');if(!t)return;t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3200);}
function initials(name='User'){return escapeHTML(name.split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase());}
function avatar(post){return post.author==='CoreFair'||post.author==='CoreFair Updates'?`<div class="avatar avatar-logo"><img src="assets/corefair-logo.png" alt=""></div>`:`<div class="avatar">${initials(post.author||'User')}</div>`;}
function visualMarkup(post){
  if(post.image_url) return `<div class="post-image"><img src="${escapeHTML(post.image_url)}" alt="Post image" loading="lazy" onerror="this.parentElement.innerHTML='<div class=&quot;image-fallback&quot;>CoreFair<span>BUSINESS COMMUNITY</span></div>'"></div>`;
  if(post.image) return `<div class="post-image"><img src="${escapeHTML(post.image)}" alt="Post image" loading="lazy" onerror="this.parentElement.innerHTML='<div class=&quot;image-fallback&quot;>CoreFair<span>BUSINESS COMMUNITY</span></div>'"></div>`;
  const visuals={brand:['CoreFair','YOUR BUSINESS. YOUR COMMUNITY.'],products:['Special Offer','PRODUCTS · VALUE · QUALITY'],tips:['Small Steps','BIG DREAMS'],services:['Creative Studio','IDEAS INTO IMPACT'],launch:['New Collection','MADE FOR WHAT’S NEXT'],community:['Grow Together','CONNECT · SHARE · GROW']};
  const [title,sub]=visuals[post.visual]||['CoreFair','BUSINESS COMMUNITY'];
  return `<div class="post-image"><div class="image-fallback">${escapeHTML(title)}<span>${escapeHTML(sub)}</span></div></div>`;
}
function relativeAge(value){
  if(!value)return 'Just now';
  const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value);
  const mins=Math.max(0,Math.floor((Date.now()-d.getTime())/60000));
  if(mins<1)return 'Just now';if(mins<60)return `${mins}m ago`;
  const hours=Math.floor(mins/60);if(hours<24)return `${hours}h ago`;
  const days=Math.floor(hours/24);if(days<7)return `${days}d ago`;
  return d.toLocaleDateString();
}
function renderPosts(){
  if(['business','messages','notifications','profile','settings'].includes(currentView)){ renderSpecialView(); return; }
  const q=($('#searchInput')?.value||'').trim().toLowerCase();
  let list=posts.filter(p=>(currentFilter==='All'||p.category===currentFilter) && (!q||[p.title,p.body,p.author,p.category].join(' ').toLowerCase().includes(q)));
  if(currentView==='my-posts') list=list.filter(p=>currentUser && p.user_id===currentUser.id);
  $('#postList').innerHTML=list.map(p=>`<article class="post-card" data-post="${escapeHTML(p.id)}">
    <div class="post-top">${avatar(p)}<div class="post-author"><b>${escapeHTML(p.author||'CoreFair user')}</b><small>${escapeHTML(p.age||relativeAge(p.created_at))}</small></div><button class="more-btn" aria-label="Post options" data-action="more" data-id="${escapeHTML(p.id)}">···</button></div>
    ${visualMarkup(p)}
    <div class="post-body"><h3>${escapeHTML(p.title)}</h3><p>${escapeHTML(p.body)}</p><span class="tag ${escapeHTML(p.category)}">${escapeHTML(p.category)}</span></div>
    <div class="post-actions"><button class="post-action ${p.liked_by_me?'liked':''}" data-action="like" data-id="${escapeHTML(p.id)}" aria-label="Like post">${p.liked_by_me?'♥':'♡'} <span>${p.likes_count||0}</span></button><button class="post-action" data-action="comment" data-id="${escapeHTML(p.id)}" aria-label="Comment">▢ <span>${p.comments_count||0}</span></button><button class="post-action share" data-action="share" data-id="${escapeHTML(p.id)}" aria-label="Share post">↗</button></div>
  </article>`).join('');
  $('#emptyState').classList.toggle('hidden',list.length>0);
  $('#postList').classList.toggle('hidden',list.length===0);
}
function setView(view){
  currentView=view;
  $$('.nav-link[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  $$('.side-link').forEach(b=>b.classList.toggle('selected',b.dataset.view===view));
  const titles={home:['Latest Posts','Discover updates, offers and insights from our community.'],posts:['Explore Posts','Find business ideas, offers, products and services.'],'my-posts':['My Posts','Manage the posts you have created.'],business:['Discover Businesses','Explore brands, services and business ideas.'],messages:['Messages','Send private messages to other CoreFair members.'],notifications:['Notifications','See likes, comments, and account activity.'],profile:['Your Profile','Your public profile and business information.'],settings:['Settings','Manage your account preferences.']};
  $('#feedTitle').textContent=(titles[view]||titles.home)[0];
  $('#feedSubtitle').textContent=(titles[view]||titles.home)[1];
  $('#filterRow').style.display=['home','posts','my-posts'].includes(view)?'flex':'none';
  $('#createPostBtn').style.display=['home','posts','my-posts'].includes(view)?'inline-flex':'none';
  renderPosts();
  if(innerWidth<680) $('#posts').scrollIntoView({behavior:'smooth',block:'start'});
}
async function requireLogin(){ if(!currentUser){authModal('login');showToast('Please log in to use this feature.');return false;} return true; }
function specialPanel(html){ $('#postList').classList.remove('hidden'); $('#emptyState').classList.add('hidden'); $('#postList').innerHTML=html; }
async function renderSpecialView(){
 if(!supabase){ specialPanel(`<div class="panel" style="padding:24px"><h3>${escapeHTML(currentView[0].toUpperCase()+currentView.slice(1))}</h3><p>Connect Supabase to enable saved profiles, business directory, private messages and notifications.</p><button class="btn btn-dark" id="specialSignup">Create account</button></div>`); $('#specialSignup')?.addEventListener('click',()=>authModal('signup')); return; }
 if(['profile','settings','messages','notifications'].includes(currentView) && !await requireLogin()) return;
 if(currentView==='profile') return showProfileView();
 if(currentView==='business') return showBusinessView();
 if(currentView==='messages') return showMessagesView();
 if(currentView==='notifications') return showNotificationsView();
 if(currentView==='settings') return showSettingsView();
}
async function showProfileView(){
 const {data:p}=await supabase.from('profiles').select('*').eq('id',currentUser.id).maybeSingle();
 specialPanel(`<div class="panel" style="padding:24px"><h3>Your Profile</h3><p class="muted">Edit how other CoreFair members see you.</p><form id="profileEditForm" class="modal-form"><label>Full name<input name="full_name" maxlength="80" required value="${escapeHTML(p?.full_name||currentUser.user_metadata?.full_name||'')}"></label><label>Username<input name="username" pattern="[A-Za-z0-9_]{3,30}" required value="${escapeHTML(p?.username||currentUser.user_metadata?.username||'member')}"></label><label>Bio<textarea name="bio" maxlength="500">${escapeHTML(p?.bio||'')}</textarea></label><label>Avatar image URL (optional)<input name="avatar_url" type="url" value="${escapeHTML(p?.avatar_url||'')}" placeholder="https://..."></label><button class="btn btn-dark" type="submit">Save Profile</button></form></div>`);
 $('#profileEditForm').addEventListener('submit',async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));const {error}=await supabase.from('profiles').upsert({id:currentUser.id,...d},{onConflict:'id'});if(error){showToast(error.message);return;}await supabase.auth.updateUser({data:{full_name:d.full_name,username:d.username}});updateUserUI();showToast('Profile saved.');});
}
async function showBusinessView(){
 const {data:mine}=currentUser?await supabase.from('business_profiles').select('*').eq('user_id',currentUser.id).maybeSingle():{data:null};
 const {data:all,error}=await supabase.from('business_profiles').select('user_id,business_name,category,description,website,location,profiles(full_name,username,avatar_url)').order('created_at',{ascending:false}).limit(50);
 specialPanel(`<div class="panel" style="padding:22px;margin-bottom:16px"><h3>Business Directory</h3><p class="muted">Discover local brands, products and services.</p>${currentUser?`<form id="businessForm" class="modal-form"><label>Business name<input name="business_name" required maxlength="100" value="${escapeHTML(mine?.business_name||'')}"></label><label>Category<input name="category" required maxlength="60" placeholder="Retail, Technology, Services…" value="${escapeHTML(mine?.category||'')}"></label><label>Description<textarea name="description" maxlength="1000" required>${escapeHTML(mine?.description||'')}</textarea></label><label>Website<input name="website" type="url" placeholder="https://…" value="${escapeHTML(mine?.website||'')}"></label><label>Location<input name="location" maxlength="120" placeholder="City, country" value="${escapeHTML(mine?.location||'')}"></label><button class="btn btn-dark" type="submit">${mine?'Update Business Profile':'Create Business Profile'}</button></form>`:'<p>Log in to create a business profile.</p>'}</div><div class="panel" style="padding:22px"><h3>Businesses on CoreFair</h3>${error?'<p>Run the latest supabase/schema.sql to enable business directory.</p>':(all||[]).map(b=>`<article class="post-card" style="padding:16px"><h4>${escapeHTML(b.business_name)}</h4><span class="tag">${escapeHTML(b.category||'Business')}</span><p>${escapeHTML(b.description||'')}</p><small>${escapeHTML(b.location||'')}</small>${b.website?`<p><a href="${escapeHTML(b.website)}" target="_blank" rel="noopener">Visit website ↗</a></p>`:''}<small>By ${escapeHTML(b.profiles?.full_name||b.profiles?.username||'CoreFair member')}</small></article>`).join('')||'<p>No business profiles yet. Be the first!</p>'}</div>`);
 $('#businessForm')?.addEventListener('submit',async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));d.user_id=currentUser.id;const q=mine?supabase.from('business_profiles').update(d).eq('user_id',currentUser.id):supabase.from('business_profiles').insert(d);const {error}=await q;if(error){showToast(error.message);return;}showToast('Business profile saved.');showBusinessView();});
}
async function showMessagesView(){
 const {data:users,error:uerr}=await supabase.from('profiles').select('id,full_name,username').neq('id',currentUser.id).order('full_name').limit(100);
 const options=(users||[]).map(u=>`<option value="${u.id}">${escapeHTML(u.full_name||u.username)} (@${escapeHTML(u.username)})</option>`).join('');
 specialPanel(`<div class="panel" style="padding:22px"><h3>Private Messages</h3><p class="muted">Choose a member and send a private message.</p>${uerr?'<p>Run the latest database schema to enable messaging.</p>':`<form id="messageForm" class="modal-form"><label>Send to<select name="recipient_id" required>${options||'<option value="">No other members yet</option>'}</select></label><label>Message<textarea name="body" required maxlength="2000" placeholder="Write a message…"></textarea></label><button class="btn btn-dark" ${users?.length?'':'disabled'}>Send Message</button></form>`}<div id="messageHistory" style="margin-top:20px"><h4>Recent conversations</h4><p>Loading…</p></div></div>`);
 const form=$('#messageForm');form?.addEventListener('submit',async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));const {error}=await supabase.from('messages').insert({sender_id:currentUser.id,recipient_id:d.recipient_id,body:d.body.trim()});if(error){showToast(error.message);return;}e.currentTarget.reset();showToast('Message sent.');loadMessageHistory();});
 async function loadMessageHistory(){const {data,error}=await supabase.from('messages').select('id,sender_id,recipient_id,body,created_at,sender:profiles!messages_sender_id_fkey(full_name,username),recipient:profiles!messages_recipient_id_fkey(full_name,username)').or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`).order('created_at',{ascending:false}).limit(50);const el=$('#messageHistory');if(!el)return;el.innerHTML=error?'<p>Could not load messages. Check schema setup.</p>':`<h4>Recent conversations</h4>${(data||[]).map(m=>`<article class="post-card" style="padding:14px"><b>${escapeHTML(m.sender_id===currentUser.id?'You → '+(m.recipient?.full_name||m.recipient?.username):(m.sender?.full_name||m.sender?.username)+' → You')}</b><p>${escapeHTML(m.body)}</p><small>${escapeHTML(relativeAge(m.created_at))}</small></article>`).join('')||'<p>No messages yet.</p>'}`;}
 loadMessageHistory();
}
async function showNotificationsView(){
 const {data,error}=await supabase.from('notifications').select('id,kind,message,created_at,is_read,actor:profiles!notifications_actor_id_fkey(full_name,username)').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(100);
 specialPanel(`<div class="panel" style="padding:22px"><h3>Notifications</h3><p class="muted">Activity and updates for your account.</p>${error?'<p>Run the latest supabase/schema.sql to enable notifications.</p>':(data||[]).map(n=>`<article class="post-card" style="padding:14px"><b>${escapeHTML(n.actor?.full_name||n.actor?.username||'CoreFair')}</b><p>${escapeHTML(n.message)}</p><small>${escapeHTML(relativeAge(n.created_at))}${n.is_read?' · Read':' · New'}</small></article>`).join('')||'<p>You are all caught up. New activity will appear here.</p>'}</div>`);
 await supabase.from('notifications').update({is_read:true}).eq('user_id',currentUser.id).eq('is_read',false);
}
function showSettingsView(){
 specialPanel(`<div class="panel" style="padding:22px"><h3>Account Settings</h3><p class="muted">Manage account security and session.</p><form id="passwordForm" class="modal-form"><label>New password<input name="password" type="password" minlength="8" required placeholder="At least 8 characters"></label><button class="btn btn-dark">Change Password</button></form><hr><button class="btn btn-light" id="settingsLogout">Log out of CoreFair</button><p class="muted" style="margin-top:14px">For security, never share your password or Supabase secret/service-role key.</p></div>`);
 $('#passwordForm').addEventListener('submit',async e=>{e.preventDefault();const password=new FormData(e.currentTarget).get('password');const {error}=await supabase.auth.updateUser({password});if(error)showToast(error.message);else{e.currentTarget.reset();showToast('Password updated successfully.');}});$('#settingsLogout').addEventListener('click',logout);
}
function openModal(content){$('#modalContent').innerHTML=content;$('#modalBackdrop').classList.remove('hidden');document.body.style.overflow='hidden';}
function closeModal(){$('#modalBackdrop').classList.add('hidden');document.body.style.overflow='';}
function updateUserUI(){
  if(currentUser){
    $('#sidebarName').textContent=currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'CoreFair User';
    $('#sidebarHandle').textContent='@'+(currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'member');
    $('#loginBtn').textContent='Logout';$('#signupBtn').textContent='Account';
  } else {
    $('#sidebarName').textContent='CoreFair';$('#sidebarHandle').textContent='@corefair';
    $('#loginBtn').textContent='Login';$('#signupBtn').textContent='Sign Up';
  }
}
function authModal(mode='signup'){
 const signup=mode==='signup';
 openModal(`<h2 id="modalTitle">${signup?'Create your CoreFair account':'Welcome back'}</h2><p>${signup?'Join the community and start growing your business.':'Sign in to continue to your business community.'}</p>
 <form class="modal-form" id="authForm">
 ${signup?'<label>Full name<input name="name" placeholder="Your name" required minlength="2" maxlength="80"></label><label>Username<input name="username" placeholder="yourbusiness" required minlength="3" maxlength="30" pattern="[A-Za-z0-9_]+" title="Use letters, numbers and underscores"></label>':''}
 <label>Email address<input name="email" type="email" placeholder="you@business.com" required autocomplete="email"></label>
 <label>Password<input name="password" type="password" placeholder="At least 8 characters" required minlength="8" autocomplete="${signup?'new-password':'current-password'}"></label>
 <button class="btn btn-dark full-width" type="submit">${signup?'Create Account':'Login'}</button>
 </form><div class="modal-switch">${signup?'Already have an account?':'New to CoreFair?'} <button class="text-btn" id="switchAuth">${signup?'Login':'Sign Up'}</button></div>`);
 $('#authForm').addEventListener('submit',async e=>{
   e.preventDefault();if(!supabase){showToast('First configure your Supabase URL and anon/publishable key in supabase-config.js.');return;}
   const data=Object.fromEntries(new FormData(e.currentTarget).entries());
   const submit=e.currentTarget.querySelector('button[type="submit"]');submit.disabled=true;submit.textContent='Please wait…';
   try{
     if(signup){
       const {data:result,error}=await supabase.auth.signUp({email:data.email,password:data.password,options:{data:{full_name:data.name,username:data.username}}});
       if(error)throw error;
       if(result.session){session=result.session;currentUser=result.user;await ensureProfile(result.user);updateUserUI();closeModal();showToast('Account created. Welcome to CoreFair!');await loadPosts();}
       else {closeModal();showToast('Check your email to confirm your account, then log in.');}
     }else{
       const {data:result,error}=await supabase.auth.signInWithPassword({email:data.email,password:data.password});
       if(error)throw error;session=result.session;currentUser=result.user;await ensureProfile(result.user);updateUserUI();closeModal();showToast('Successfully signed in.');await loadPosts();
     }
   }catch(err){showToast(err.message||'Authentication failed.');submit.disabled=false;submit.textContent=signup?'Create Account':'Login';}
 });
 $('#switchAuth').addEventListener('click',()=>authModal(signup?'login':'signup'));
}
async function ensureProfile(user){
  if(!supabase||!user)return;
  const name=user.user_metadata?.full_name||user.email?.split('@')[0]||'CoreFair User';
  const username=user.user_metadata?.username||user.email?.split('@')[0]||`user_${user.id.slice(0,8)}`;
  const {error}=await supabase.from('profiles').upsert({id:user.id,full_name:name,username},{onConflict:'id',ignoreDuplicates:true});
  if(error)console.warn('Profile upsert note:',error.message);
}
async function logout(){
 if(!supabase){showToast('Configure Supabase first.');return;}
 const {error}=await supabase.auth.signOut();if(error){showToast(error.message);return;}
 session=null;currentUser=null;updateUserUI();await loadPosts();showToast('You have been logged out.');
}
function forgotModal(){openModal(`<h2 id="modalTitle">Reset your password</h2><p>We will send a password reset link to your email.</p><form class="modal-form" id="forgotForm"><label>Email address<input type="email" name="email" placeholder="you@business.com" required></label><button class="btn btn-dark full-width">Send reset link</button></form>`);$('#forgotForm').addEventListener('submit',async e=>{e.preventDefault();if(!supabase){showToast('Configure Supabase first.');return;}const email=new FormData(e.currentTarget).get('email');const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error)showToast(error.message);else{closeModal();showToast('Password reset email sent if the account exists.');}});}
function createPostModal(){
 if(!currentUser){authModal('signup');showToast('Sign up or log in to publish a post.');return;}
 openModal(`<h2 id="modalTitle">Create a Post</h2><p>Share a product, business update, offer or idea with the CoreFair community.</p>
 <form class="modal-form" id="postForm">
 <label>Post title<input name="title" placeholder="What would you like to share?" required maxlength="120"></label>
 <label>Description<textarea name="body" placeholder="Tell the community more…" required maxlength="3000"></textarea></label>
 <label>Category<select name="category"><option>Business</option><option>Products</option><option>Services</option><option>Offers</option><option>Tips</option><option>Updates</option></select></label>
 <label>Image URL (optional)<input name="image_url" type="url" placeholder="https://example.com/image.jpg"></label><label>Or upload an image<input name="image_file" type="file" accept="image/*"></label>
 <button class="btn btn-dark full-width" type="submit">Publish Post</button></form>`);
 $('#postForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!supabase){showToast('Configure Supabase first.');return;}
  const fd=new FormData(e.currentTarget);const d=Object.fromEntries(fd.entries());const submit=e.currentTarget.querySelector('button');submit.disabled=true;submit.textContent='Publishing…';
  try{
    let imageUrl=d.image_url.trim()||null;const file=d.image_file;if(file&&file.size){if(file.size>5*1024*1024)throw new Error('Image must be 5 MB or smaller.');const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');const path=`${currentUser.id}/${Date.now()}.${ext}`;const up=await supabase.storage.from('post-images').upload(path,file,{upsert:false,contentType:file.type});if(up.error)throw up.error;imageUrl=supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;}
    const {error}=await supabase.from('posts').insert({user_id:currentUser.id,title:d.title.trim(),body:d.body.trim(),category:d.category,image_url:imageUrl});
    if(error)throw error;closeModal();currentFilter='All';$$('.filter').forEach(b=>b.classList.toggle('active',b.dataset.filter==='All'));setView('home');await loadPosts();showToast('Your post has been published.');
  }catch(err){showToast(err.message||'Could not publish post.');submit.disabled=false;submit.textContent='Publish Post';}
 });
}
async function loadPosts(){
 if(!supabase){posts=demoPosts;renderPosts();return;}
 try{
   const {data:rows,error}=await supabase.from('posts').select('id,user_id,title,body,category,image_url,created_at,profiles(full_name,username),post_likes(user_id),comments(id)').order('created_at',{ascending:false}).limit(60);
   if(error)throw error;
   posts=(rows||[]).map(p=>({id:p.id,user_id:p.user_id,title:p.title,body:p.body,category:p.category, image_url:p.image_url,created_at:p.created_at,age:relativeAge(p.created_at),author:p.profiles?.full_name||p.profiles?.username||'CoreFair user',handle:'@'+(p.profiles?.username||'member'),likes_count:p.post_likes?.length||0,comments_count:p.comments?.length||0,liked_by_me:!!currentUser&&!!p.post_likes?.some(l=>l.user_id===currentUser.id),is_demo:false}));
   renderPosts();
 }catch(err){console.error(err);posts=demoPosts;renderPosts();showToast('Could not load database posts. Check SQL setup and RLS policies.');}
}
async function toggleLike(id){
 const p=posts.find(x=>x.id===id);if(!p)return;
 if(p.is_demo){showToast('Sample posts are previews. Log in and use real community posts to interact.');return;}
 if(!currentUser){authModal('login');showToast('Log in to like posts.');return;}
 try{
  if(p.liked_by_me){const {error}=await supabase.from('post_likes').delete().eq('post_id',id).eq('user_id',currentUser.id);if(error)throw error;}
  else {const {error}=await supabase.from('post_likes').insert({post_id:id,user_id:currentUser.id});if(error)throw error; if(p.user_id!==currentUser.id) await supabase.from('notifications').insert({user_id:p.user_id,actor_id:currentUser.id,kind:'like',message:`${currentUser.user_metadata?.full_name||'Someone'} liked your post: ${p.title}`});}
  await loadPosts();
 }catch(err){showToast(err.message||'Could not update like.');}
}
function commentModal(p){
 if(p.is_demo){showToast('Comments are available on real database posts.');return;}
 openModal(`<h2 id="modalTitle">Comments</h2><p><b>${escapeHTML(p.title)}</b></p><div id="commentsList" class="comment-list"><p>Loading comments…</p></div><form class="modal-form" id="commentForm"><label>Add a comment<textarea name="body" placeholder="Write a thoughtful comment…" required maxlength="1500"></textarea></label><button class="btn btn-dark full-width">Add Comment</button></form>`);
 loadComments(p.id);
 $('#commentForm').addEventListener('submit',async e=>{e.preventDefault();if(!currentUser){authModal('login');return;}const body=new FormData(e.currentTarget).get('body').trim();const {error}=await supabase.from('comments').insert({post_id:p.id,user_id:currentUser.id,body});if(error){showToast(error.message);return;}if(p.user_id!==currentUser.id)await supabase.from('notifications').insert({user_id:p.user_id,actor_id:currentUser.id,kind:'comment',message:`${currentUser.user_metadata?.full_name||'Someone'} commented on your post: ${p.title}`});e.currentTarget.reset();await loadComments(p.id);await loadPosts();showToast('Comment added.');});
}
async function loadComments(postId){
 const list=$('#commentsList');if(!list)return;
 const {data,error}=await supabase.from('comments').select('id,body,created_at,profiles(full_name,username)').eq('post_id',postId).order('created_at',{ascending:true}).limit(100);
 if(error){list.innerHTML='<p>Could not load comments. Check database setup.</p>';return;}
 list.innerHTML=data.length?data.map(c=>`<div class="comment-item"><b>${escapeHTML(c.profiles?.full_name||c.profiles?.username||'Member')}</b><small>${escapeHTML(relativeAge(c.created_at))}</small><p>${escapeHTML(c.body)}</p></div>`).join(''):'<p>No comments yet. Be the first to join the conversation.</p>';
}
async function sharePost(p){
 const url=location.href.split('#')[0]+'#post-'+p.id;
 try{if(navigator.share)await navigator.share({title:p.title,text:p.body,url});else if(navigator.clipboard){await navigator.clipboard.writeText(url);showToast('Post link copied.');}else showToast(url);}catch(e){}
}
async function handlePostAction(b){
 const p=posts.find(x=>x.id===b.dataset.id);if(!p)return;
 if(b.dataset.action==='like')await toggleLike(p.id);
 if(b.dataset.action==='comment'){if(!currentUser){authModal('login');showToast('Log in to view and add comments.');return;}commentModal(p);}
 if(b.dataset.action==='share')await sharePost(p);
 if(b.dataset.action==='more'){
   if(p.is_demo){showToast('This is sample content.');return;}
   if(currentUser&&p.user_id===currentUser.id){
     openModal(`<h2 id="modalTitle">Delete this post?</h2><p>This permanently deletes the post and its related likes and comments.</p><div class="hero-buttons"><button class="btn btn-dark" id="confirmDelete">Delete Post</button><button class="btn btn-light" id="cancelDelete">Cancel</button></div>`);
     $('#cancelDelete').addEventListener('click',closeModal);
     $('#confirmDelete').addEventListener('click',async()=>{const {error}=await supabase.from('posts').delete().eq('id',p.id).eq('user_id',currentUser.id);if(error){showToast(error.message);return;}closeModal();await loadPosts();showToast('Post deleted.');});
   }else showToast('You can delete only your own posts.');
 }
}

$('#heroLoginForm').addEventListener('submit',async e=>{e.preventDefault();if(!supabase){showToast('Configure Supabase URL and key in supabase-config.js first.');return;}const d=Object.fromEntries(new FormData(e.currentTarget).entries());const {data,error}=await supabase.auth.signInWithPassword({email:d.email,password:d.password});if(error){showToast(error.message);return;}session=data.session;currentUser=data.user;await ensureProfile(currentUser);updateUserUI();await loadPosts();showToast('Successfully signed in.');});
$('#loginBtn').addEventListener('click',()=>currentUser?logout():authModal('login'));
$('#signupBtn').addEventListener('click',()=>currentUser?showToast(`Signed in as ${currentUser.email}`):authModal('signup'));
$('#heroSignupBtn').addEventListener('click',()=>authModal('signup'));
$('#joinNowBtn').addEventListener('click',()=>authModal('signup'));
$('#getStartedBtn').addEventListener('click',()=>authModal('signup'));
$('#googleBtn').addEventListener('click',async()=>{if(!supabase){showToast('Configure Supabase first.');return;}const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname}});if(error)showToast(error.message);});
$('#forgotBtn').addEventListener('click',forgotModal);
$('#createPostBtn').addEventListener('click',createPostModal);
$('#sidebarCreateBtn').addEventListener('click',createPostModal);
$('#emptyCreateBtn').addEventListener('click',createPostModal);
$('#exploreBtn').addEventListener('click',()=>{setView('posts');$('#posts').scrollIntoView({behavior:'smooth'});});
$('#modalClose').addEventListener('click',closeModal);
$('#modalBackdrop').addEventListener('click',e=>{if(e.target===$('#modalBackdrop'))closeModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
$('#searchInput').addEventListener('input',renderPosts);
$$('.topic').forEach(b=>b.addEventListener('click',()=>{const topic=(b.childNodes[0]?.textContent||b.textContent).trim().replace(/^#/,'');$('#searchInput').value=topic;currentView='posts';setView('posts');$('#searchInput').focus();}));
$('#filterRow').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;currentFilter=b.dataset.filter;$$('.filter').forEach(x=>x.classList.toggle('active',x===b));renderPosts();});
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b)handlePostAction(b);});
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
$('#mobileMenuBtn').addEventListener('click',()=>{$('.profile-sidebar').scrollIntoView({behavior:'smooth',block:'center'});showToast('Use the dashboard menu below to navigate.');});
$('#year').textContent=new Date().getFullYear();

async function init(){
 if(!supabase){updateUserUI();posts=demoPosts;renderPosts();showToast('Demo mode: add Supabase credentials to enable real accounts and posts.');return;}
 try{
  const {data,error}=await supabase.auth.getSession();if(error)throw error;
  session=data.session;currentUser=session?.user||null;
  supabase.auth.onAuthStateChange((_event,newSession)=>{session=newSession;currentUser=newSession?.user||null;updateUserUI();if(currentUser)ensureProfile(currentUser);loadPosts();});
  updateUserUI();
  if(currentUser)await ensureProfile(currentUser);
  await loadPosts();
 }catch(err){console.error(err);showToast('Supabase connection failed. Check your project URL and public key.');posts=demoPosts;renderPosts();}
}
init();
