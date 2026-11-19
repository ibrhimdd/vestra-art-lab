import { useEffect, useRef, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Camera, Check, ImagePlus, Save, Shirt, Sparkles, UploadCloud } from 'lucide-react'

const looks = [
  {id:'linen',name:'إطلالة الكتان',type:'طبيعي · صيفي',color:'#c6b89b',accent:'#65765b'},
  {id:'urban',name:'إطلالة حضرية',type:'معاصر · يومي',color:'#414c5c',accent:'#d2a47f'},
  {id:'classic',name:'إطلالة كلاسيكية',type:'رسمي · هادئ',color:'#273b35',accent:'#c5b38d'},
  {id:'creative',name:'إطلالة فنية',type:'جريء · تجريبي',color:'#a35e50',accent:'#e0c77e'},
]
export default function VirtualTryOnSection({user,onNotice}) {
  const [photo,setPhoto]=useState(''); const [photoName,setPhotoName]=useState(''); const [look,setLook]=useState(looks[0]); const [saved,setSaved]=useState(false); const [history,setHistory]=useState([]); const [error,setError]=useState('')
  const input=useRef(null)
  useEffect(()=>{let alive=true;const load=async()=>{if(!user?.uid||!db)return;try{const snap=await getDoc(doc(db,'users',user.uid));if(alive)setHistory(snap.exists()?(snap.data().tryOnSessions||[]):[])}catch(e){console.error(e)}};load();return()=>{alive=false}},[user?.uid])
  useEffect(()=>()=>{if(photo.startsWith('blob:'))URL.revokeObjectURL(photo)},[photo])
  const choose=e=>{const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith('image/')){setError('اختر صورة بصيغة مدعومة.');return}if(file.size>12*1024*1024){setError('حجم الصورة يجب ألا يتجاوز 12 ميجابايت.');return}setPhoto(URL.createObjectURL(file));setPhotoName(file.name);setSaved(false);setError('')}
  const save=async()=>{if(!user?.uid||!db||!photoName)return;try{const item={id:`tryon-${Date.now()}`,photoName,lookId:look.id,lookName:look.name,createdAt:new Date().toISOString(),mode:'styling-plan'};const next=[item,...history].slice(0,20);await setDoc(doc(db,'users',user.uid),{uid:user.uid,tryOnSessions:next,updatedAt:serverTimestamp()},{merge:true});setHistory(next);setSaved(true);onNotice?.('تم حفظ جلسة تنسيق الملابس في حسابك.')}catch(e){setError('تعذر حفظ الجلسة. حاول مرة أخرى.')}}
  return <section className="section-block tryon-section"><div className="section-heading"><div><div className="section-kicker">UPLOAD · STYLE · SAVE</div><h2>استوديو تنسيق الإطلالات</h2><p>جهّز صورة مرجعية، واختر اتجاهاً للملابس، واحفظ جلسات التنسيق لمشروعك.</p></div></div>
    <div className="tryon-notice"><Sparkles size={17}/><span><strong>مرحلة المعاينة الحالية:</strong> هذه النسخة تنظم صورة المرجع واختيارات التنسيق فقط. توليد ارتداء واقعي بالذكاء الاصطناعي يحتاج ربط محرك تجربة افتراضية ومفتاح خدمة خادمي.</span></div>
    <div className="tryon-layout"><div className="tryon-photo-panel"><input ref={input} className="visually-hidden" type="file" accept="image/*" onChange={choose}/>{photo?<img className="tryon-user-photo" src={photo} alt="الصورة المرجعية"/>:<div className="tryon-photo-empty"><Camera size={30}/><strong>أضف صورتك المرجعية</strong><span>يفضل صورة واضحة بإضاءة جيدة</span></div>}<button className="tryon-upload" onClick={()=>input.current?.click()}><ImagePlus size={16}/> {photo?'تغيير الصورة':'اختيار صورة'}</button>{photoName&&<small>{photoName}</small>}</div>
      <div className="tryon-options"><div className="tryon-title"><Shirt size={18}/><strong>اختر اتجاه الإطلالة</strong></div><div className="tryon-looks">{looks.map(item=><button key={item.id} className={look.id===item.id?'selected':''} onClick={()=>{setLook(item);setSaved(false)}}><span className="tryon-look-swatch" style={{background:`linear-gradient(135deg,${item.color} 0 58%,${item.accent} 58%)`}}/><strong>{item.name}</strong><small>{item.type}</small>{look.id===item.id&&<Check size={15}/>}</button>)}</div><button className="tryon-save" onClick={save} disabled={!photoName}><Save size={16}/>{saved?'تم حفظ الجلسة':'حفظ جلسة التنسيق'}</button>{error&&<p className="materials-error">{error}</p>}</div></div>
    <div className="tryon-history"><strong>جلساتك المحفوظة</strong>{history.length?history.map(item=><div key={item.id}><span>{item.lookName}</span><small>{item.photoName}</small></div>):<p>لم تحفظ جلسات بعد.</p>}</div>
  </section>
}
