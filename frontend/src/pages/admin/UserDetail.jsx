import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
export default function UserDetail(){
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('')
  const [ordered, setOrdered] = useState(false)
  useEffect(()=>{ fetch(`/api/admin/users/${id}`,{credentials:'include'}).then(r=>r.json()).then(d=>{ setData(d); setStatus(d.status||''); setOrdered(!!d.ordered) }) },[id])
  const saveOrder = async ()=>{ await fetch(`/api/admin/users/${id}/order`,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({ordered})}) }
  const saveStatus = async ()=>{ await fetch(`/api/admin/users/${id}/status`,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({status:status||null})}) }
  if(!data) return null
  return (<div className="grid gap-4 md:grid-cols-[320px_1fr]">
    <aside className="paper p-4">
      <div className="font-serif text-xl mb-1">{data.name}</div><div className="text-muted">{data.email}</div>
      <div className="mt-4"><div className="font-semibold mb-2">Обложка</div><div className="cover bg-gradient-to-br from-blush to-lav w-[120px]"><div className="meta">{data.cover || '—'}</div></div></div>
      <div className="mt-4"><label className="flex items-center gap-2"><input type="checkbox" checked={ordered} onChange={e=>setOrdered(e.target.checked)} /> Заказ оформлен</label><button className="btn mt-2" onClick={saveOrder}>Сохранить заказ</button></div>
      <div className="mt-4"><div className="font-semibold mb-2">Статус книги</div><select className="input" value={status} onChange={e=>setStatus(e.target.value)}>
        <option value="">— Выберите статус —</option><option value="in_review">🕒 Ожидает проверку</option><option value="in_design">✍️ В дизайне</option><option value="printing">🖨️ Печатается</option><option value="ready">🎁 Готово к вручению</option><option value="shipped">📦 Отправлено</option><option value="delivered">📬 Доставлено</option>
      </select><button className="btn mt-2" onClick={saveStatus}>Сохранить статус</button></div>
    </aside>
    <main className="paper p-4">
      <h3 className="font-serif text-xl mb-2">Ответы пользователя</h3>
      <div className="space-y-3">{data.answers?.length ? data.answers.map((a,i)=>(
        <div key={i} className="p-3 border border-line rounded-[14px] bg-paper">
          <div className="text-muted text-sm mb-1">Вопрос {a.questionIndex+1}</div>
          <div className="whitespace-pre-wrap">{a.text || '—'}</div>
        </div>
      )) : <div className="text-muted">Ответов пока нет.</div>}</div>
    </main>
  </div>)
}