/* ---------- Pure logic: formats, labels, prompts, parsing, export. No DOM here. ---------- */
var CLASSES=['Pre-Primary','Standard I','Standard II','Standard III','Standard IV','Standard V','Standard VI','Standard VII','Form I','Form II','Form III','Form IV','Form V','Form VI'];
var MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
var SUBJ_LOWER=['Kusoma (Reading)','Kuandika (Writing)','Kuhesabu (Numeracy)','Kutunza Afya na Mazingira (Health care and environment)','Sanaa na Michezo (Sports and arts)','English','Religious Education (Dini)'];
var SUBJ_UPPER=['Kiswahili','English','Mathematics','Science','Geography and the Environment (Jiografia na Mazingira)','Historia ya Tanzania na Maadili','Sports and Arts (Sanaa na Michezo)','French','Arabic','Chinese','Religious Education (Dini)'];
var SUBJ_UPPER_OLD=['Kiswahili','English','Mathematics','Science and Technology','Social Studies (Maarifa ya Jamii)','Civic and Moral Education (Uraia na Maadili)','Vocational Skills (Stadi za Kazi)','Religious Education (Dini)'];
function subjGroups(cls){
  if(cls==='Standard I'||cls==='Standard II')return [['Standard I-II, 2023 curriculum',SUBJ_LOWER]];
  if(/^Standard (III|IV|V|VI)$/.test(cls))return [['Standard III-VI, 2023 curriculum',SUBJ_UPPER],['Earlier syllabus',SUBJ_UPPER_OLD]];
  if(cls==='Standard VII')return [['Earlier syllabus',SUBJ_UPPER_OLD],['2023 curriculum',SUBJ_UPPER]];
  if(/^Form/.test(cls))return [['Secondary',SUBJECTS]];
  return [];
}
function classNote(m){
  if(m.class==='Standard I'||m.class==='Standard II')return 'Note: Standard I-II follows one combined TIE syllabus organised by competence areas (reading, writing, numeracy, health and environment care, sports and arts). Treat the subject above as that competence area and pitch everything for 6-8 year olds, with songs, play, stories and real objects.\n';
  if(m.class==='Pre-Primary')return 'Note: this is a pre-primary class (ages 5-6). Use play-based learning, songs, stories and real objects.\n';
  return '';
}
var SUBJECTS=['Basic Mathematics','Biology','Chemistry','Physics','Geography','History','Civics','Business Studies','Book Keeping','Commerce','Computer Science','Agriculture','Literature in English','French','Arabic','Advanced Mathematics','Economics','General Studies','Kiswahili','English','Mathematics','Geography and Environment','History of Tanzania and Morality'];

var FMT={
  new:{
    sow:['main_competence','specific_competence','main_activity','specific_activity','month','week','periods','methods','resources','assessment_tools','references','remarks'],
    sowW:[13,13,12,13,6,4,5,10,9,7,8,6],
    lp:['main_competence','specific_competence','main_activity','specific_activity','resources','references'],
    stages:['introduction','competence_development','design','realisation'],
    assess:'assess_criteria', after:['remarks'],
    desc:'the 2023 revised competence-based curriculum. Lessons have four stages: Introduction (pupils show what they already know), Competence development (concrete learning experience and guided practice), Design (pupils apply the competence to plan or create something of their own) and Realisation (pupils present or carry out what they designed, and the teacher closes the lesson)'
  },
  old:{
    sow:['competence','objectives','month','week','main_topic','sub_topic','periods','teaching_activities','learning_activities','materials','references','assessment','remarks'],
    sowW:[10,11,6,4,8,8,5,12,12,8,7,7,5],
    lp:['competence','general_objective','specific_objectives','main_topic','sub_topic','resources','references'],
    stages:['introduction','new_knowledge','reinforcement','reflection','consolidation'],
    assess:'assessment', after:['pupil_eval','teacher_eval','remarks'],
    desc:'the earlier syllabus format organised by topics and objectives. Lessons have five stages: Introduction, New knowledge, Reinforcement, Reflection and Consolidation'
  }
};
var NUMCOL={month:1,week:1,periods:1};

var LBL={
 en:{sow_title:'SCHEME OF WORK',lp_title:"TEACHER'S LESSON PLAN",school:'Name of school',teacher:"Teacher's name",subject:'Subject',class:'Class',year:'Year',term:'Term',date:'Date',period:'Period',time:'Time',
  attendance:'Number of pupils',registered:'Registered',present:'Present',girls:'Girls',boys:'Boys',total:'Total',
  main_competence:'Main competence',specific_competence:'Specific competence',main_activity:'Main activity',specific_activity:'Specific activity',month:'Month',week:'Week',periods:'Number of periods',methods:'Teaching and learning methods',resources:'Teaching and learning resources',assessment_tools:'Assessment tools',references:'References',remarks:'Remarks',
  competence:'Competence',objectives:'Objectives',main_topic:'Main topic',sub_topic:'Sub topic',teaching_activities:'Teaching activities',learning_activities:'Learning activities',materials:'Teaching and learning materials',assessment:'Assessment',general_objective:'General objective',specific_objectives:'Specific objectives',
  process:'Teaching and learning process',stage:'Stage',time_min:'Time (minutes)',teaching:'Teaching activities',learning:'Learning activities',assess_criteria:'Assessment criteria',
  introduction:'Introduction',competence_development:'Competence development',design:'Design',realisation:'Realisation',new_knowledge:'New knowledge',reinforcement:'Reinforcement',reflection:'Reflection',consolidation:'Consolidation',
  pupil_eval:"Pupils' evaluation",teacher_eval:"Teacher's evaluation",exercise:'Class exercise',answers:'Answers',homework:'Homework'},
 sw:{sow_title:'AZIMIO LA KAZI',lp_title:'ANDALIO LA SOMO',school:'Jina la shule',teacher:'Jina la mwalimu',subject:'Somo',class:'Darasa',year:'Mwaka',term:'Muhula',date:'Tarehe',period:'Kipindi',time:'Muda',
  attendance:'Idadi ya wanafunzi',registered:'Walioandikishwa',present:'Waliohudhuria',girls:'Wasichana',boys:'Wavulana',total:'Jumla',
  main_competence:'Umahiri mkuu',specific_competence:'Umahiri mahususi',main_activity:'Shughuli kuu',specific_activity:'Shughuli mahususi',month:'Mwezi',week:'Wiki',periods:'Idadi ya vipindi',methods:'Mbinu za ufundishaji na ujifunzaji',resources:'Zana za ufundishaji na ujifunzaji',assessment_tools:'Zana za upimaji',references:'Rejea',remarks:'Maoni',
  competence:'Umahiri',objectives:'Malengo',main_topic:'Mada kuu',sub_topic:'Mada ndogo',teaching_activities:'Vitendo vya ufundishaji',learning_activities:'Vitendo vya ujifunzaji',materials:'Zana za ufundishaji na ujifunzaji',assessment:'Upimaji',general_objective:'Lengo kuu',specific_objectives:'Malengo mahususi',
  process:'Mchakato wa ufundishaji na ujifunzaji',stage:'Hatua',time_min:'Muda (dakika)',teaching:'Shughuli za ufundishaji',learning:'Shughuli za ujifunzaji',assess_criteria:'Vigezo vya upimaji',
  introduction:'Utangulizi',competence_development:'Kujenga umahiri',design:'Kubuni',realisation:'Utekelezaji',new_knowledge:'Maarifa mapya',reinforcement:'Kuimarisha maarifa',reflection:'Tafakuri',consolidation:'Hitimisho',
  pupil_eval:'Tathmini ya wanafunzi',teacher_eval:'Tathmini ya mwalimu',exercise:'Zoezi la darasani',answers:'Majibu',homework:'Kazi ya nyumbani'}
};
function L(doc,k){return (LBL[doc.lang]||LBL.en)[k]||LBL.en[k]||k;}
function langName(l){return l==='sw'?'Kiswahili (standard Tanzanian Kiswahili as used in TIE materials)':'English';}

var COMMON='You are an experienced Tanzanian teacher educator who knows the Tanzania Institute of Education (TIE) syllabi and planning formats. Write for a real public-school classroom in Tanzania: large classes, few textbooks, locally available and improvised materials, learner-centred participatory methods, and inclusion of pupils with special needs. Use Tanzanian examples, names and shillings where examples are needed. ';

function shapeOf(keys){return '{'+keys.map(function(k){return '"'+k+'":"..."';}).join(',')+'}';}

function sowPrompt(m,part,prev){
  var f=FMT[m.fmt],p='';
  p+=COMMON+'\n\nTask: draft a SCHEME OF WORK in the TIE layout for '+f.desc+'.\n';
  p+='Subject: '+m.subject+'\nClass: '+m.class+'\nYear: '+m.year+'\nTerm: '+m.term+'\nTerm starts: '+m.month+'\nTeaching weeks in the term: '+m.weeks+'\nPeriods per week: '+m.ppw+'\n'+classNote(m);
  if(m.ctx)p+='Teacher notes: '+m.ctx+'\n';
  if(m.syll)p+='\nSyllabus content supplied by the teacher (authoritative; use its competences, activities and topics with their wording, do not add content from outside it, and spread it across the whole term):\n"""\n'+m.syll+'\n"""\n';
  else p+='\nThe teacher supplied no syllabus text. Draft from your knowledge of the TIE syllabus for this subject and class, choosing content normally taught in this term. Keep wording close to syllabus style.\n';
  p+='\nThis request covers term weeks '+part.from+' to '+part.to+' only (part '+part.i+' of '+part.n+').';
  if(prev&&prev.length)p+=' Earlier weeks already cover the following, so continue after them without repeating:\n- '+prev.join('\n- ')+'\n';
  p+='\n\nRules:\n- One row per '+(m.fmt==='new'?'specific activity':'sub topic')+'; a row may span one to three weeks.\n- "month" is the month name; "week" is the week within that month (1 to 5), or a range such as "2-3". Week 1 of the term is the first week of '+m.month+'. Keep rows in date order.\n- "periods" is a number. Periods across these rows should total about '+((part.to-part.from+1)*m.ppw)+'.\n- If these weeks include the middle of the term, add one row for mid-term tests and break; if they include the last weeks of the term, add rows for revision and end-of-term examinations. In such rows put the event in the first column and leave the other text columns as "".\n- Keep every cell short: at most 22 words. Separate list items with "; ".\n- "references": name the TIE syllabus and textbook for this subject and class in general terms. Never invent page numbers or titles you are not sure of.\n- "remarks" is always "" (the teacher fills it in after teaching).\n- Write every value in '+langName(m.lang)+'.\n';
  p+='\nReturn only JSON, no markdown, in exactly this shape:\n{"rows":['+shapeOf(f.sow)+'],"check":"one short sentence in English naming what the teacher should verify against the syllabus"}';
  return p;
}

function lpShape(fmt){
  var f=FMT[fmt];
  return '{"fields":'+shapeOf(f.lp)+',"stages":['+f.stages.map(function(s){return '{"key":"'+s+'","time":0,"teaching":"...","learning":"...","assessment":"..."}';}).join(',')+'],"exercise":[{"q":"...","a":"..."}],"homework":"..."}';
}
function lpPrompt(m){
  var f=FMT[m.fmt],p='';
  p+=COMMON+'\n\nTask: draft ONE LESSON PLAN in the TIE layout for '+f.desc+'.\n';
  p+='Subject: '+m.subject+'\nClass: '+m.class+'\nLesson length: '+m.dur+' minutes\nNumber of pupils: '+((+m.girls||0)+(+m.boys||0)||'not given')+'\n';
  p+=classNote(m)+'What the lesson covers: '+m.topic+'\n';
  if(m.syll)p+='From the teacher\'s syllabus or scheme of work (authoritative; reuse this wording for competences and activities):\n"""\n'+m.syll+'\n"""\n';
  if(m.ctx)p+='About the class: '+m.ctx+'\n';
  p+='\nRules:\n- Stage "time" values are whole minutes and must add up to exactly '+m.dur+'. '+(m.fmt==='new'?'Give roughly 10-15% to Introduction, 45-50% to Competence development, 25-30% to Design and the rest to Realisation.':'Give most time to New knowledge and Reinforcement.')+'\n- "teaching" says what the teacher does, "learning" says what pupils do, step by step and concretely (actual questions to ask, actual tasks, how groups are formed). Two to four short sentences each.\n- "assessment" states '+(m.fmt==='new'?'the observable criteria that show pupils are achieving the competence at that stage':'how the teacher checks understanding at that stage')+'.\n- "resources": real objects and low-cost materials available in a Tanzanian school or village.\n- "references": name the TIE syllabus and pupil\'s book for the subject and class in general terms; never invent page numbers.\n'+(m.fmt==='old'?'- "specific_objectives" begins "By the end of the lesson, each pupil should be able to:" followed by 2-3 measurable objectives.\n':'')+'- "exercise": 5 questions matched to the lesson, easy to hard, each with a correct answer. Double-check any arithmetic.\n- "homework": one short task.\n- Write every value in '+langName(m.lang)+'.\n';
  p+='\nReturn only JSON, no markdown, in exactly this shape:\n'+lpShape(m.fmt);
  return p;
}
function refinePrompt(doc,ask){
  var shape=doc.type==='sow'?'{"rows":['+shapeOf(FMT[doc.fmt].sow)+']}':lpShape(doc.fmt);
  return COMMON+'\n\nHere is a '+(doc.type==='sow'?'scheme of work':'lesson plan')+' for '+doc.meta.subject+', '+doc.meta.class+', as JSON:\n'+JSON.stringify(doc.data)+'\n\nThe teacher asks for this change: "'+ask+'"\n\nApply the change and keep everything else as it is. '+(doc.type==='lp'?'Stage times must still add up to '+doc.meta.dur+' minutes. ':'')+'Write in '+langName(doc.lang)+'. Return only the full updated JSON, no markdown, in this shape:\n'+shape;
}

/* Parse model output; salvage a truncated rows array if needed. */
function parseJSON(text){
  var s=String(text||''),a=s.indexOf('{');
  if(a<0)throw new Error('no json');
  var b=s.lastIndexOf('}');
  try{return JSON.parse(s.slice(a,b+1));}catch(e){}
  var i=b,tries=0;
  while(i>a&&tries<40){
    var cut=s.slice(a,i+1);
    try{return JSON.parse(cut+']}');}catch(e){}
    i=s.lastIndexOf('}',i-1);tries++;
  }
  throw new Error('bad json');
}
function str(v){return v==null?'':(Array.isArray(v)?v.join('; '):String(v));}
function cleanSow(obj,fmt){
  var keys=FMT[fmt].sow,rows=(obj&&obj.rows)||[];
  return rows.filter(function(r){return r&&typeof r==='object';}).map(function(r){var o={};keys.forEach(function(k){o[k]=str(r[k]);});return o;});
}
function cleanLp(obj,fmt){
  var f=FMT[fmt],d={fields:{},stages:[],exercise:[],homework:str(obj&&obj.homework)};
  f.lp.forEach(function(k){d.fields[k]=str(obj&&obj.fields&&obj.fields[k]);});
  f.stages.forEach(function(k,i){
    var src=((obj&&obj.stages)||[]).filter(function(s){return s&&s.key===k;})[0]||((obj&&obj.stages)||[])[i]||{};
    d.stages.push({key:k,time:parseInt(src.time,10)||0,teaching:str(src.teaching),learning:str(src.learning),assessment:str(src.assessment)});
  });
  ((obj&&obj.exercise)||[]).slice(0,10).forEach(function(e){if(e)d.exercise.push({q:str(e.q),a:str(e.a)});});
  f.after.forEach(function(k){d[k]=str(obj&&obj[k]);});
  return d;
}
function stageTotal(doc){return doc.data.stages.reduce(function(t,s){return t+(parseInt(s.time,10)||0);},0);}
function docTitle(doc){
  var m=doc.meta;
  return (doc.type==='sow'?'Scheme of work':'Lesson plan')+' - '+m.subject+' - '+m.class+(doc.type==='sow'?' - Term '+m.term+' '+m.year:(m.topic?' - '+m.topic:''));
}
function metaPairs(doc){
  var m=doc.meta,a=[['school',m.school],['teacher',m.teacher],['subject',m.subject],['class',m.class]];
  if(doc.type==='sow'){a.push(['year',m.year],['term',m.term]);}
  else{a.push(['date',m.date],['period',m.period],['time',m.time]);}
  return a;
}

/* Plain text for the Copy button. */
function toText(doc){
  var out=[],f=FMT[doc.fmt];
  out.push(L(doc,doc.type==='sow'?'sow_title':'lp_title'));
  metaPairs(doc).forEach(function(p){out.push(L(doc,p[0])+': '+(p[1]||'................'));});
  out.push('');
  if(doc.type==='sow'){
    out.push(f.sow.map(function(k){return L(doc,k);}).join('\t'));
    doc.data.rows.forEach(function(r){out.push(f.sow.map(function(k){return (r[k]||'').replace(/\s+/g,' ');}).join('\t'));});
  }else{
    var m=doc.meta,g=+m.girls||0,b=+m.boys||0;
    out.push(L(doc,'attendance')+' - '+L(doc,'registered')+': '+L(doc,'girls')+' '+(g||'__')+', '+L(doc,'boys')+' '+(b||'__')+', '+L(doc,'total')+' '+((g+b)||'__')+' | '+L(doc,'present')+': '+L(doc,'girls')+' __, '+L(doc,'boys')+' __, '+L(doc,'total')+' __');
    out.push('');
    f.lp.forEach(function(k){out.push(L(doc,k)+': '+doc.data.fields[k]);});
    out.push('',L(doc,'process').toUpperCase());
    doc.data.stages.forEach(function(s){
      out.push('',L(doc,s.key)+' ('+s.time+' min)',L(doc,'teaching')+': '+s.teaching,L(doc,'learning')+': '+s.learning,L(doc,f.assess)+': '+s.assessment);
    });
    f.after.forEach(function(k){out.push('',L(doc,k)+': '+(doc.data[k]||'........................................'));});
    if(doc.data.exercise.length){out.push('',L(doc,'exercise'));doc.data.exercise.forEach(function(e,i){out.push((i+1)+'. '+e.q);});
      out.push('',L(doc,'answers'));doc.data.exercise.forEach(function(e,i){out.push((i+1)+'. '+e.a);});}
    if(doc.data.homework)out.push('',L(doc,'homework')+': '+doc.data.homework);
  }
  return out.join('\n');
}

/* Word export. D is the docx library namespace. */
function buildDocx(doc,D){
  var f=FMT[doc.fmt],land=doc.type==='sow',W=land?15398:10466,FONT='Times New Roman';
  function run(t,o){o=o||{};return new D.TextRun({text:t,bold:!!o.bold,size:o.size||(land?18:22),font:FONT});}
  function para(t,o){o=o||{};return new D.Paragraph({alignment:o.center?D.AlignmentType.CENTER:D.AlignmentType.LEFT,spacing:{after:o.after==null?60:o.after},children:[run(t,o)]});}
  function paras(t,o){var parts=String(t==null?'':t).split(/\n/);return parts.map(function(x){return para(x,o);});}
  function cell(t,w,o){return new D.TableCell({width:{size:w,type:D.WidthType.DXA},margins:{top:50,bottom:50,left:70,right:70},children:paras(t,o)});}
  function table(weights,rows,head){
    var sum=weights.reduce(function(a,b){return a+b;},0),ws=weights.map(function(x){return Math.floor(W*x/sum);});
    var trs=[];
    if(head)trs.push(new D.TableRow({tableHeader:true,children:head.map(function(h,i){return cell(h,ws[i],{bold:true});})}));
    rows.forEach(function(r){trs.push(new D.TableRow({children:r.map(function(c,i){return cell(c,ws[i]);})}));});
    return new D.Table({width:{size:W,type:D.WidthType.DXA},columnWidths:ws,rows:trs});
  }
  function kv(k,v){return new D.Paragraph({spacing:{after:80},children:[run(L(doc,k)+': ',{bold:true}),run(v||'')]});}
  var kids=[para(L(doc,doc.type==='sow'?'sow_title':'lp_title'),{bold:true,center:true,size:28,after:200})];
  var mp=metaPairs(doc),mrows=[];
  for(var i=0;i<mp.length;i+=2){mrows.push([L(doc,mp[i][0])+': '+(mp[i][1]||'..............................'),mp[i+1]?L(doc,mp[i+1][0])+': '+(mp[i+1][1]||'..............................'):'']);}
  if(doc.type==='lp'&&mp.length%2===1){/* already padded */}
  kids.push(table([1,1],mrows),para(''));
  if(doc.type==='sow'){
    kids.push(table(f.sowW,doc.data.rows.map(function(r){return f.sow.map(function(k){return r[k];});}),f.sow.map(function(k){return L(doc,k);})));
  }else{
    var m=doc.meta,g=+m.girls||0,b=+m.boys||0;
    kids.push(para(L(doc,'attendance'),{bold:true}));
    kids.push(table([2,1,1,1],[[L(doc,'registered'),g?String(g):'',b?String(b):'',(g+b)?String(g+b):''],[L(doc,'present'),'','','']],['',L(doc,'girls'),L(doc,'boys'),L(doc,'total')]),para(''));
    f.lp.forEach(function(k){kids.push(kv(k,doc.data.fields[k]));});
    kids.push(para(''),para(L(doc,'process').toUpperCase(),{bold:true,center:true,after:120}));
    kids.push(table([3,2,7,7,5],doc.data.stages.map(function(s){return [L(doc,s.key),String(s.time),s.teaching,s.learning,s.assessment];}),[L(doc,'stage'),L(doc,'time_min'),L(doc,'teaching'),L(doc,'learning'),L(doc,f.assess)]));
    f.after.forEach(function(k){kids.push(para(''),kv(k,doc.data[k]));if(!doc.data[k]){kids.push(para('....................................................................................................................................'),para('....................................................................................................................................'));}});
    if(doc.data.exercise.length){
      kids.push(new D.Paragraph({pageBreakBefore:true,spacing:{after:120},children:[run(L(doc,'exercise'),{bold:true,size:24})]}));
      doc.data.exercise.forEach(function(e,i){kids.push(para((i+1)+'. '+e.q));});
      kids.push(para(''),para(L(doc,'answers'),{bold:true}));
      doc.data.exercise.forEach(function(e,i){kids.push(para((i+1)+'. '+e.a));});
    }
    if(doc.data.homework)kids.push(para(''),kv('homework',doc.data.homework));
  }
  return new D.Document({sections:[{properties:{page:{size:{orientation:land?D.PageOrientation.LANDSCAPE:D.PageOrientation.PORTRAIT},margin:{top:720,bottom:720,left:720,right:720}}},children:kids}]});
}

var EXAMPLE_LP={type:'lp',fmt:'new',lang:'en',example:true,
 meta:{school:'Mlimani Primary School',teacher:'Mwl. Neema Mushi',subject:'Mathematics',class:'Standard IV',date:'',period:'3rd',time:'9:20 - 10:00',dur:40,girls:34,boys:31,topic:'Add fractions with the same denominator'},
 data:{fields:{main_competence:'Apply mathematical skills in different contexts',specific_competence:'Use fractions to solve problems in daily life',main_activity:'Performing operations on fractions',specific_activity:'Adding fractions with the same denominator',resources:'Chapati or paper circles cut into equal parts; bottle tops; manila cards with fraction strips; chalkboard',references:'TIE Mathematics syllabus and pupil\'s book for Standard IV'},
  stages:[
   {key:'introduction',time:5,teaching:'Hold up a chapati cut into 4 equal parts. Ask: "If Juma eats 1 part and Asha eats 2 parts, how much have they eaten together?" Collect answers without correcting them.',learning:'Pupils name the fraction for one part, then discuss the question in pairs and share their guesses.',assessment:'Pupils name one quarter correctly and offer an answer with a reason.'},
   {key:'competence_development',time:19,teaching:'Group pupils in sixes with paper circles cut into 4 and 8 parts. Guide them to join parts and record 1/4 + 2/4 and 3/8 + 2/8. Lead them to see that only numerators are added.',learning:'Pupils join the parts, count them, write the addition sentences in their exercise books and state the rule in their own words.',assessment:'Each group records correct sums and explains why the denominator stays the same.'},
   {key:'design',time:11,teaching:'Ask each group to write its own word problem about sharing sugarcane, land or water using fractions with the same denominator, then solve it on a manila card.',learning:'Groups agree on a story from home or the market, write the problem, draw it and solve it.',assessment:'The problem uses a common denominator and the drawing matches the answer.'},
   {key:'realisation',time:5,teaching:'Invite three groups to present. Correct any errors with the class, then restate the rule and give the exercise.',learning:'Groups present their problems. Other pupils check the answers with bottle tops.',assessment:'Presenters explain their steps and classmates confirm or correct the answer.'}],
  exercise:[{q:'1/5 + 2/5',a:'3/5'},{q:'3/7 + 2/7',a:'5/7'},{q:'4/9 + 1/9',a:'5/9'},{q:'Neema walked 2/8 km to the shop and 3/8 km to school. How far did she walk?',a:'5/8 km'},{q:'A farmer planted maize on 3/10 of a shamba and beans on 4/10. What fraction is planted?',a:'7/10'}],
  homework:'Write two word problems from home that add fractions with the same denominator, and solve them.',remarks:''}};
var EXAMPLE_SOW={type:'sow',fmt:'new',lang:'en',example:true,
 meta:{school:'Mlimani Primary School',teacher:'Mwl. Neema Mushi',subject:'Mathematics',class:'Standard IV',year:2026,term:'I',month:'January',weeks:20,ppw:6},
 data:{rows:[
  {main_competence:'Apply mathematical skills in different contexts',specific_competence:'Use fractions to solve problems in daily life',main_activity:'Performing operations on fractions',specific_activity:'Identifying and comparing fractions',month:'March',week:'1',periods:'6',methods:'Group work; demonstration; question and answer',resources:'Paper circles; fraction strips; bottle tops',assessment_tools:'Oral questions; exercise; observation checklist',references:'TIE Mathematics syllabus and pupil\'s book, Standard IV',remarks:''},
  {main_competence:'',specific_competence:'',main_activity:'',specific_activity:'Adding fractions with the same denominator',month:'March',week:'2',periods:'6',methods:'Guided discovery; think-pair-share; problem solving',resources:'Chapati or paper circles; manila cards',assessment_tools:'Exercise; group presentation; quiz',references:'TIE Mathematics syllabus and pupil\'s book, Standard IV',remarks:''},
  {main_competence:'Mid-term tests and break',specific_competence:'',main_activity:'',specific_activity:'',month:'March',week:'3-4',periods:'',methods:'',resources:'',assessment_tools:'',references:'',remarks:''}]}};

if(typeof module!=='undefined')module.exports={subjGroups:subjGroups,FMT:FMT,LBL:LBL,sowPrompt:sowPrompt,lpPrompt:lpPrompt,refinePrompt:refinePrompt,parseJSON:parseJSON,cleanSow:cleanSow,cleanLp:cleanLp,toText:toText,buildDocx:buildDocx,EXAMPLE_LP:EXAMPLE_LP,EXAMPLE_SOW:EXAMPLE_SOW,docTitle:docTitle,stageTotal:stageTotal};

if(typeof module!=='undefined'){module.exports.CLASSES=CLASSES;module.exports.MONTHS=MONTHS;}
