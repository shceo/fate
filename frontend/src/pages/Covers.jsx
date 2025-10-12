import React from 'react'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
const options = [
  ['Свадьба','Маленькие радости'],['День рождения','Тридцать и расцвет'],['Годовщина','Наше первое десятилетие'],['Рождение малыша','Добро пожаловать, Нур'],
  ['Дружба','Дом — это люди'],['Путешествие','Письма у моря'],['Семья','Воскресенья'],['Память','Нежное воспоминание'],
]
export default function Covers(){
  const pick = async (name)=>{ await fetch('/api/cover', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ name }) }); alert('Обложка выбрана: ' + name) }
  return (<div><Header/><div className="topbar"><div className="container mx-auto px-4 py-3 text-muted">Выберите обложку книги</div></div>
    <section className="container mx-auto px-4 mt-4">
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {options.map((o,i)=>{
          const cls = ['from-lav to-sky','from-sage to-gold','from-blush to-lav','from-[#f9f1ea] to-gold','from-sky to-sage','from-[#f6e9e4] to-[#f1f3f9]','from-[#efe8de] to-[#f6f0ea]','from-[#eee8ff] to-[#f7f2ea]'][i]
          return (<label key={i} className={`cover bg-gradient-to-br ${cls}`}>
            <input type="radio" name="cover" className="absolute inset-0 opacity-0 cursor-pointer" onChange={()=>pick(`${o[0]} — ${o[1]}`)} />
            <span className="tag">{o[0]}</span><div className="meta font-serif">{o[1]}</div></label>)
        })}
      </div>
    </section><Footer/></div>) }