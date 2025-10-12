import React, { useEffect, useState } from 'react'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import Progress from '../components/Progress.jsx'
export default function QA(){
  const [qIndex, setQIndex] = useState(0)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  useEffect(()=>{ fetch('/api/questions',{credentials:'include'}).then(r=>r.json()).then(setQuestions) }, [])
  const save = async ()=>{
    const entries = Object.keys(answers).map(i=>({ questionIndex:Number(i), text:answers[i] }))
    await fetch('/api/answers',{ method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body:JSON.stringify({ entries }) })
    alert('Ответ сохранён')
  }
  const next = async ()=>{
    if(qIndex < questions.length-1) setQIndex(qIndex+1)
    else { await fetch('/api/complete',{method:'POST',credentials:'include'}); location.href='/complete' }
  }
  const prev = ()=> setQIndex(Math.max(0,qIndex-1))
  const value = answers[qIndex] || ''
  return (<div><Header/><section className="min-h-[100dvh] grid place-items-center py-8 px-4">
    <div className="paper w-[min(820px,94vw)] p-6">
      <div className="text-muted flex justify-between flex-wrap gap-2">
        <span>Вопрос {qIndex+1} из {questions.length || 1}</span><span>Черновик: Ваша книга</span>
      </div>
      <h1 className="font-serif text-[clamp(1.4rem,3.8vw,2.4rem)] leading-tight mt-2">{questions[qIndex] || ''}</h1>
      <Progress value={Math.round(100*((qIndex+1)/(questions.length||1)))}/>
      <textarea className="input min-h-[220px] text-[1.05rem] mt-3" placeholder="Напишите здесь свой ответ…"
        value={value} onChange={e=>setAnswers(a=>({...a,[qIndex]:e.target.value}))} />
      <div className="flex justify-between gap-2 mt-3">
        <button className="btn" onClick={prev}>Назад</button>
        <div className="flex gap-2">
          <button className="btn" onClick={save}>Сохранить</button>
          <button className="btn primary" onClick={next}>{qIndex < (questions.length-1) ? 'Далее' : 'Завершить'}</button>
        </div>
      </div>
    </div>
  </section><Footer/></div>) }