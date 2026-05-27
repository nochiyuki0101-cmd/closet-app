import * as ImagePicker from "expo-image-picker";
// import * as ExpoLinking from "expo-linking"; // TODO: 認証復活時にコメントを戻す（シェア機能）
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Modal, ScrollView, /*Share,*/ StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../lib/auth";
import type { ClothItem } from "../lib/db";
import { addCloth, deleteCloth, subscribeToClothes, uploadClothImage } from "../lib/db";
import type { Lang, T } from "../lib/i18n";
import { useLang } from "../lib/i18n";
import type { WeatherInfo } from "../lib/weather";
import { fetchWeather } from "../lib/weather";

const BRAND="#1a0a2e";
const CATS=["すべて","トップス","ジャケット/アウター","パンツ","オールインワン","スカート","ワンピース/ドレス","バッグ","シューズ","ファッション雑貨"];
const TPOS=["すべて","仕事","デート","カジュアル"];
const SEASONS=["春","夏","秋","冬","オールシーズン"];
const COORDS=[{id:"1",tpo:"仕事",weather:"☀️ 18°C",ids:["1","4","2","6"],comment:"オフィスコーデ。ネイビーニットで知的な印象に。",score:94},{id:"2",tpo:"デート",weather:"☁️ 15°C",ids:["1","3","5"],comment:"コートでエレガントに。スカートが女性らしさをプラス。",score:88}];
const INIT=[{id:"1",name:"白シャツ",cat:"トップス",bg:"#F5F5F0",icon:"👔",last:"2日前",image:null},{id:"2",name:"黒スキニー",cat:"ボトムス",bg:"#222",icon:"👖",last:"1週間前",image:null},{id:"3",name:"コート",cat:"アウター",bg:"#C9B99A",icon:"🧥",last:"2週間前",image:null},{id:"4",name:"ネイビーニット",cat:"トップス",bg:"#1B2A4A",icon:"🧶",last:"3日前",image:null},{id:"5",name:"スカート",cat:"ボトムス",bg:"#8B6B6B",icon:"👗",last:"1ヶ月前",image:null},{id:"6",name:"スニーカー",cat:"シューズ",bg:"#EFEFEF",icon:"👟",last:"昨日",image:null}];
type CoordItem={id:string;tpo:string;weather:string;ids:string[];comment:string;score:number};
type SettingKey='weatherSync'|'considerHistory'|'morningNotif';

async function fetchSuggestedCoords(clothes:ClothItem[],tpo:string,weather:WeatherInfo|null,lang:Lang):Promise<CoordItem[]>{
  const key=process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  const list=clothes.map(c=>`ID:${c.id} 名前:${c.name} カテゴリ:${c.cat}`).join('\n');
  const scene=tpo==='すべて'?'自由なシーン':tpo;
  const weatherCtx=weather
    ?`今日の天気は${weather.emoji}${weather.label}、気温は${weather.temp}°Cです。この気温と天気に適した服装を優先してください。`
    :'';
  const weatherLabel=weather?`${weather.emoji} ${weather.temp}°C`:'';
  const langInstr=lang==='en'?'Write the "comment" field in English.':'';
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),30000);
  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':key!,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({
        model:'claude-haiku-4-5-20251001',
        max_tokens:1024,
        messages:[{role:'user',content:`以下の服のリストからTPO「${scene}」に合うコーディネートを2通り提案してください。${weatherCtx}${langInstr}\n\n服のリスト:\n${list}\n\n以下のJSON配列のみを返してください（説明文は不要）:\n[{"id":"1","tpo":"${scene}","weather":"${weatherLabel}","ids":["服のIDを3〜4個"],"comment":"コーデの説明50文字以内","score":90},{"id":"2","tpo":"${scene}","weather":"${weatherLabel}","ids":["服のIDを2〜3個"],"comment":"コーデの説明50文字以内","score":85}]`}],
      }),
      signal:ctrl.signal,
    });
    if(!res.ok)throw new Error(`API error: ${res.status}`);
    const data=await res.json();
    const text:string=data.content[0].text;
    const match=text.match(/\[[\s\S]*\]/);
    if(!match)throw new Error('Invalid response');
    return JSON.parse(match[0]) as CoordItem[];
  }finally{
    clearTimeout(timer);
  }
}

async function requestAndPick(cam:boolean,t:T):Promise<{uri:string;base64:string;mimeType:string}|null>{
  const{status,canAskAgain}=cam
    ?await ImagePicker.requestCameraPermissionsAsync()
    :await ImagePicker.requestMediaLibraryPermissionsAsync();
  if(status!=='granted'){
    Alert.alert(
      cam?t.cameraPermTitle:t.albumPermTitle,
      cam?t.cameraPermMsg:t.albumPermMsg,
      canAskAgain
        ?[{text:'OK'}]
        :[{text:t.cancel,style:'cancel'},{text:t.openSettings,onPress:()=>Linking.openSettings()}]
    );
    return null;
  }
  const opts={allowsEditing:true,aspect:[3,4] as [number,number],quality:0.7,base64:true};
  const r=cam
    ?await ImagePicker.launchCameraAsync(opts)
    :await ImagePicker.launchImageLibraryAsync(opts);
  if(r.canceled)return null;
  const asset=r.assets[0];
  return{uri:asset.uri,base64:asset.base64??'',mimeType:asset.mimeType??'image/jpeg'};
}

async function fetchClothAnalysis(base64:string,mimeType:string,lang:Lang):Promise<{names:string[];cat:string;color:string;season:string}>{
  const key=process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  const catList=["トップス","ジャケット/アウター","パンツ","オールインワン","スカート","ワンピース/ドレス","バッグ","シューズ","ファッション雑貨"];
  const prompt=lang==='en'
    ?`Analyze this clothing item. Return only JSON:\n{"names":["3 short English names max 10 chars each"],"cat":"one of: ${catList.join(',')}","color":"main color in Japanese (e.g. 白,黒,ネイビー,ベージュ)","season":"one of: 春,夏,秋,冬,オールシーズン"}\nExample: {"names":["White Shirt","Cotton Top","Basic Tee"],"cat":"トップス","color":"白","season":"オールシーズン"}`
    :`この服を解析してJSONのみ返してください:\n{"names":["短い名前を3つ（各10文字以内）"],"cat":"${catList.join('、')}のどれか","color":"メインカラー（例：白、黒、ネイビー、ベージュ）","season":"春、夏、秋、冬、オールシーズンのどれか"}\n例：{"names":["白シャツ","コットンT","ベーシック"],"cat":"トップス","color":"白","season":"オールシーズン"}`;
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),20000);
  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':key!,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({
        model:'claude-haiku-4-5-20251001',
        max_tokens:256,
        messages:[{role:'user',content:[
          {type:'image',source:{type:'base64',media_type:mimeType,data:base64}},
          {type:'text',text:prompt},
        ]}],
      }),
      signal:ctrl.signal,
    });
    if(!res.ok)throw new Error(`API error: ${res.status}`);
    const data=await res.json();
    const text:string=data.content[0].text;
    const match=text.match(/\{[\s\S]*\}/);
    if(!match)throw new Error('Invalid response');
    const r=JSON.parse(match[0]);
    return{
      names:Array.isArray(r.names)?r.names.slice(0,3):[],
      cat:catList.includes(r.cat)?r.cat:catList[0],
      color:typeof r.color==='string'?r.color:'',
      season:SEASONS.includes(r.season)?r.season:'オールシーズン',
    };
  }finally{
    clearTimeout(timer);
  }
}

export default function App(){
  const{t}=useLang();
  // const{user}=useAuth(); // TODO: 認証復活時にコメントを戻す
  const uid='test-user';
  const TABS_I18N=useMemo(()=>[{label:t.tabCloset,icon:"🗂️"},{label:t.tabSuggest,icon:"✨"},{label:t.tabSettings,icon:"⚙️"}],[t]);
  const[tab,setTab]=useState(0);
  const[clothes,setClothes]=useState<ClothItem[]>([]);
  const[loading,setLoading]=useState(true);
  const[weather,setWeather]=useState<WeatherInfo|null>(null);
  const[weatherLoading,setWeatherLoading]=useState(true);
  const seeded=useRef(false);

  const clothesMap=useMemo(()=>new Map(clothes.map(c=>[c.id,c])),[clothes]);

  useEffect(()=>{
    if(!uid)return;
    return subscribeToClothes(uid,(items)=>{
      if(!seeded.current){
        seeded.current=true;
        if(items.length===0){
          Promise.all(INIT.map(({id,...rest})=>addCloth(uid,rest))).catch(console.error);
          return;
        }
      }
      setClothes(items);
      setLoading(false);
    });
  },[uid]);

  useEffect(()=>{
    fetchWeather()
      .then(setWeather)
      .catch(()=>setWeather(null))
      .finally(()=>setWeatherLoading(false));
  },[]);

  // if(!user||loading)return( // TODO: 認証復活時にコメントを戻す
  //   <SafeAreaView style={[s.safe,{justifyContent:"center",alignItems:"center"}]}>
  //     <ActivityIndicator size="large" color={BRAND}/>
  //   </SafeAreaView>
  // );

  return(
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content"/>
      <View style={{flex:1}}>
        {tab===0&&<ClosetScreen clothes={clothes}/>}
        {tab===1&&<SuggestScreen clothes={clothes} clothesMap={clothesMap} weather={weather} weatherLoading={weatherLoading}/>}
        {tab===2&&<SettingsScreen/>}
      </View>
      <View style={s.bar}>
        {TABS_I18N.map((tb,i)=>(
          <TouchableOpacity key={i} style={[s.barBtn,tab===i&&s.barBtnOn]} onPress={()=>setTab(i)}>
            <Text style={{fontSize:20}}>{tb.icon}</Text>
            <Text style={[s.barLabel,tab===i&&s.barLabelOn]}>{tb.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

function ClosetScreen({clothes}:{clothes:ClothItem[]}){
  const{t,lang}=useLang();
  // const{user}=useAuth(); // TODO: 認証復活時にコメントを戻す
  const uid='test-user';
  const[cat,setCat]=useState(CATS[0]);
  const[modal,setModal]=useState(false);
  const[nameModal,setNameModal]=useState(false);
  const[img,setImg]=useState<string|null>(null);
  const[name,setName]=useState("");
  const[nc,setNc]=useState(CATS[1]);
  const[aiSuggestions,setAiSuggestions]=useState<string[]>([]);
  const[suggestionsLoading,setSuggestionsLoading]=useState(false);
  const[color,setColor]=useState('');
  const[season,setSeason]=useState('オールシーズン');
  const[saving,setSaving]=useState(false);
  const uploadPromiseRef=useRef<Promise<string|null>>(Promise.resolve(null));
  const[detailItem,setDetailItem]=useState<ClothItem|null>(null);
  const list=cat===CATS[0]?clothes:clothes.filter(c=>c.cat===cat);

  const handleDelete=()=>{
    if(!detailItem)return;
    const id=detailItem.id;
    const itemName=detailItem.name;
    Alert.alert(
      t.deleteConfirmTitle,
      t.deleteConfirmMsg(itemName),
      [
        {text:t.cancel,style:"cancel"},
        {text:t.deleteItem,style:"destructive",onPress:()=>{
          setDetailItem(null);
          deleteCloth(uid,id).catch(()=>Alert.alert(t.errorTitle,t.deleteError));
        }},
      ]
    );
  };

  const pick=(cam:boolean)=>{
    setModal(false);
    setTimeout(()=>{
      requestAndPick(cam,t)
        .then(result=>{
          if(result){
            setImg(result.uri);
            setAiSuggestions([]);
            setColor('');
            setSeason('オールシーズン');
            setSuggestionsLoading(true);
            setNameModal(true);
            uploadPromiseRef.current=uploadClothImage(uid,result.base64,result.mimeType).catch(()=>null);
            fetchClothAnalysis(result.base64,result.mimeType,lang)
              .then(analysis=>{
                setAiSuggestions(analysis.names);
                setNc(analysis.cat);
                setColor(analysis.color);
                setSeason(analysis.season);
              })
              .catch(()=>{})
              .finally(()=>setSuggestionsLoading(false));
          }
        })
        .catch(e=>Alert.alert(t.errorTitle,e instanceof Error?e.message:String(e)));
    },300);
  };

  const save=async()=>{
    if(!name){Alert.alert(t.chooseName);return;}
    setSaving(true);
    try{
      const persistentUrl=await uploadPromiseRef.current;
      await addCloth(uid,{name,cat:nc,bg:"#E8E8E8",icon:"👗",last:t.noWorn,image:persistentUrl||img,color,season});
      setNameModal(false);setName("");setImg(null);setAiSuggestions([]);setSuggestionsLoading(false);setColor('');setSeason('オールシーズン');
    }catch{
      Alert.alert(t.errorTitle,t.deleteError);
    }finally{
      setSaving(false);
    }
  };

  return(
    <View style={{flex:1,backgroundColor:"#FAFAF7"}}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.hdr}>
          <View>
            <Text style={s.hdrSub}>{t.closetSub}</Text>
            <Text style={s.hdrTitle}>{t.closetTitle}</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={()=>setModal(true)}>
            <Text style={{color:"#fff",fontSize:26}}>+</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{paddingLeft:20,marginBottom:16}}>
          {CATS.map(c=>(
            <TouchableOpacity key={c} style={[s.chip,cat===c&&s.chipOn]} onPress={()=>setCat(c)}>
              <Text style={[s.chipTxt,cat===c&&s.chipTxtOn]}>{t.catLabels[c]??c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={s.grid}>
          {list.map(cl=>(
            <TouchableOpacity key={cl.id} style={s.card} onPress={()=>setDetailItem(cl)}>
              {cl.image?<Image source={{uri:cl.image}} style={s.cardImg}/>:<View style={[s.cardImg,{backgroundColor:cl.bg}]}><Text style={{fontSize:36}}>{cl.icon}</Text></View>}
              <Text style={s.cardName}>{cl.name}</Text>
              <Text style={s.cardSub}>{cl.last}</Text>
              <View style={s.badge}><Text style={s.badgeTxt}>{t.catLabels[cl.cat]??cl.cat}</Text></View>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{height:20}}/>
      </ScrollView>

      <Modal visible={modal} transparent animationType="none">
        <TouchableOpacity style={s.overlay} onPress={()=>setModal(false)}>
          <View style={s.sheet}>
            <View style={s.handle}/>
            <Text style={s.sheetTitle}>{t.addCloth}</Text>
            <View style={{flexDirection:"row",gap:12,marginBottom:20}}>
              <TouchableOpacity style={s.sheetOpt} onPress={()=>pick(true)}>
                <Text style={{fontSize:32}}>📷</Text>
                <Text style={s.sheetOptTxt}>{t.takePhoto}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.sheetOpt} onPress={()=>pick(false)}>
                <Text style={{fontSize:32}}>🖼️</Text>
                <Text style={s.sheetOptTxt}>{t.fromAlbum}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={s.cancelBtn} onPress={()=>setModal(false)}>
              <Text style={s.cancelTxt}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={nameModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.sheet,{maxHeight:"88%"}]}>
            <View style={s.handle}/>
            <Text style={s.sheetTitle}>{t.enterInfo}</Text>
            {img&&<Image source={{uri:img}} style={s.previewImg}/>}
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.inputLabel}>{t.chooseName}</Text>
              <TextInput
                style={s.nameInput}
                value={name}
                onChangeText={setName}
                placeholder={t.chooseName}
                placeholderTextColor="#BBB"
                maxLength={30}
                returnKeyType="done"
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:16}}>
                {suggestionsLoading
                  ?<ActivityIndicator color={BRAND} style={{marginVertical:6,marginLeft:4}}/>
                  :(aiSuggestions.length>0?aiSuggestions:t.nameSuggestions).map(n=>(
                    <TouchableOpacity key={n} style={[s.chip,name===n&&s.chipOn]} onPress={()=>setName(n)}>
                      <Text style={[s.chipTxt,name===n&&s.chipTxtOn]}>{n}</Text>
                    </TouchableOpacity>
                  ))
                }
              </ScrollView>
              <Text style={s.inputLabel}>{t.categoryLabel}</Text>
              <View style={{flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:20}}>
                {CATS.slice(1).map(c=>(
                  <TouchableOpacity key={c} style={[s.chip,nc===c&&s.chipOn]} onPress={()=>setNc(c)}>
                    <Text style={[s.chipTxt,nc===c&&s.chipTxtOn]}>{t.catLabels[c]??c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.inputLabel}>{t.colorLabel}</Text>
              <TextInput
                style={s.nameInput}
                value={color}
                onChangeText={setColor}
                placeholder={t.colorPlaceholder}
                placeholderTextColor="#BBB"
                maxLength={20}
                returnKeyType="done"
              />
              <Text style={s.inputLabel}>{t.seasonLabel}</Text>
              <View style={{flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:20}}>
                {SEASONS.map(sv=>(
                  <TouchableOpacity key={sv} style={[s.chip,season===sv&&s.chipOn]} onPress={()=>setSeason(sv)}>
                    <Text style={[s.chipTxt,season===sv&&s.chipTxtOn]}>{t.seasonLabels[sv]??sv}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={[s.cancelBtn,saving&&{opacity:0.7}]} onPress={save} disabled={saving}>
              {saving?<ActivityIndicator color="#fff"/>:<Text style={s.cancelTxt}>{t.register}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={{marginTop:12,alignItems:"center"}} onPress={()=>{setNameModal(false);setImg(null);setAiSuggestions([]);setSuggestionsLoading(false);setColor('');setSeason('オールシーズン');uploadPromiseRef.current=Promise.resolve(null);}}>
              <Text style={{color:"#999",fontSize:14}}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!detailItem} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.sheet,{maxHeight:"88%"}]}>
            <View style={s.handle}/>
            <ScrollView showsVerticalScrollIndicator={false}>
              {detailItem?.image
                ?<Image source={{uri:detailItem.image}} style={s.detailImg}/>
                :<View style={[s.detailIcon,{backgroundColor:detailItem?.bg}]}>
                  <Text style={{fontSize:72}}>{detailItem?.icon}</Text>
                </View>
              }
              <Text style={s.detailName}>{detailItem?.name}</Text>
              <View style={s.detailInfoBox}>
                <View style={s.detailRow}>
                  <Text style={s.detailRowLabel}>{t.categoryLabel}</Text>
                  <Text style={s.detailRowValue}>{t.catLabels[detailItem?.cat??'']??detailItem?.cat}</Text>
                </View>
                {detailItem?.color?(
                  <View style={s.detailRow}>
                    <Text style={s.detailRowLabel}>{t.colorLabel}</Text>
                    <Text style={s.detailRowValue}>{detailItem.color}</Text>
                  </View>
                ):null}
                {detailItem?.season?(
                  <View style={s.detailRow}>
                    <Text style={s.detailRowLabel}>{t.seasonLabel}</Text>
                    <Text style={s.detailRowValue}>{t.seasonLabels[detailItem.season]??detailItem.season}</Text>
                  </View>
                ):null}
                <View style={[s.detailRow,{borderBottomWidth:0}]}>
                  <Text style={s.detailRowLabel}>{t.lastWorn}</Text>
                  <Text style={s.detailRowValue}>{detailItem?.last}</Text>
                </View>
              </View>
            </ScrollView>
            <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
              <Text style={s.deleteTxt}>{t.deleteItem}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{marginTop:12,alignItems:"center"}} onPress={()=>setDetailItem(null)}>
              <Text style={{color:"#999",fontSize:14}}>{t.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SuggestScreen({clothes,clothesMap,weather,weatherLoading}:{
  clothes:ClothItem[];
  clothesMap:Map<string,ClothItem>;
  weather:WeatherInfo|null;
  weatherLoading:boolean;
}){
  const{lang,t}=useLang();
  const[tpo,setTpo]=useState(TPOS[0]);
  const[open,setOpen]=useState<string|null>(null);
  const[coords,setCoords]=useState<CoordItem[]>([]);
  const[loading,setLoading]=useState(false);

  const regen=async()=>{
    setLoading(true);
    try{
      const next=await fetchSuggestedCoords(clothes,tpo,weather,lang);
      setCoords(next);
    }catch{
      Alert.alert(t.errorTitle,t.suggestError);
    }finally{
      setLoading(false);
    }
  };

  const weatherLabel=weather?(lang==='en'?weather.labelEn:weather.label):'';
  const weatherStr=weatherLoading
    ?t.weatherLoading
    :weather
      ?`${weather.emoji} ${weather.city} ${weather.temp}°C・${weatherLabel}`
      :t.weatherError;

  return(
    <View style={{flex:1,backgroundColor:"#FAFAF7"}}>
      <View style={s.darkHdr}>
        <Text style={s.darkSub}>{t.todayPickSub}</Text>
        <Text style={s.darkTitle}>{t.suggestTitle}</Text>
        <Text style={s.darkWeather}>{weatherStr}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:12}}>
          {TPOS.map(tp=>(
            <TouchableOpacity key={tp} style={[s.tpoChip,tpo===tp&&s.tpoChipOn]} onPress={()=>setTpo(tp)}>
              <Text style={[s.tpoTxt,tpo===tp&&s.tpoTxtOn]}>{t.tpoLabels[tp]??tp}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <ScrollView style={{padding:20}} showsVerticalScrollIndicator={false}>
        {coords.length===0&&!loading&&(
          <View style={{alignItems:"center",marginTop:40,marginBottom:24}}>
            <Text style={{fontSize:40,marginBottom:12}}>✨</Text>
            <Text style={{fontSize:15,color:"#999",textAlign:"center",lineHeight:22}}>{t.suggestPrompt}</Text>
          </View>
        )}
        {coords.map(co=>(
          <TouchableOpacity key={co.id} style={[s.coCard,open===co.id&&s.coCardOn]} onPress={()=>setOpen(open===co.id?null:co.id)}>
            <View style={s.coHdr}>
              <View>
                <View style={s.tpoBadge}><Text style={s.tpoBadgeTxt}>{t.tpoLabels[co.tpo]??co.tpo}</Text></View>
                <Text style={s.coWeather}>{co.weather}</Text>
              </View>
              <View style={s.score}><Text style={s.scoreTxt}>{co.score}</Text></View>
            </View>
            <View style={s.coItems}>
              {co.ids.map(id=>{const cl=clothesMap.get(id);return cl?(<View key={id} style={[s.coItem,{backgroundColor:cl.bg}]}>{cl.image?<Image source={{uri:cl.image}} style={{width:"100%",height:"100%",borderRadius:14}}/>:<Text style={{fontSize:22}}>{cl.icon}</Text>}</View>):null;})}
            </View>
            {open===co.id&&<View style={s.coDetail}><Text style={s.coComment}>{co.comment}</Text></View>}
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[s.regenBtn,loading&&{opacity:0.7}]} onPress={regen} disabled={loading}>
          {loading
            ?<ActivityIndicator color="#fff"/>
            :<Text style={s.regenTxt}>{coords.length===0?t.generateBtn:t.regenBtn}</Text>}
        </TouchableOpacity>
        <View style={{height:20}}/>
      </ScrollView>
    </View>
  );
}


function SettingsScreen(){
  const{t}=useLang();
  const{user}=useAuth();
  // const signOut = useAuth().signOut; // TODO: 認証復活時にコメントを戻す
  const[settings,setSettings]=useState<Record<SettingKey,boolean>>({
    weatherSync:true,
    considerHistory:true,
    morningNotif:false,
  });
  const toggle=(key:SettingKey)=>setSettings(prev=>({...prev,[key]:!prev[key]}));
  const settingRows:[SettingKey,string,string][]=[
    ['weatherSync',t.weatherSync,t.weatherSyncSub],
    ['considerHistory',t.considerHistory,t.considerHistorySub],
    ['morningNotif',t.morningNotif,t.morningNotifSub],
  ];

  const avatarInitial=(user?.displayName??user?.email??'?')[0].toUpperCase();
  const displayName=user?.displayName??user?.email??'';

  // const handleShare=async()=>{ // TODO: 認証復活時にコメントを戻す
  //   const uid=user?.uid;
  //   if(!uid)return;
  //   const url=ExpoLinking.createURL('shared/'+uid);
  //   await Share.share({message:url});
  // };

  return(
    <ScrollView style={{flex:1,backgroundColor:"#FAFAF7"}}>
      <View style={s.hdr}>
        <Text style={s.hdrSub}>{t.settingsSub}</Text>
        <Text style={s.hdrTitle}>{t.settingsTitle}</Text>
      </View>
      <View style={[s.settCard,{marginBottom:16}]}>
        <View style={{flexDirection:"row",alignItems:"center",gap:12}}>
          <View style={s.avatar}><Text style={{color:"#fff",fontSize:20,fontWeight:"700"}}>{avatarInitial}</Text></View>
          <View style={{flex:1}}>
            <Text style={s.settTitle}>{displayName}</Text>
            <Text style={s.settSub}>{user?.email??''}</Text>
          </View>
        </View>
      </View>
      {/* TODO: 認証復活時に戻す（シェア機能）
      <View style={[s.settCard,{marginBottom:16}]}>
        <TouchableOpacity style={s.shareRow} onPress={handleShare}>
          <Text style={{fontSize:20}}>🔗</Text>
          <Text style={[s.settLabel,{flex:1,marginLeft:12}]}>{t.shareMyCloset}</Text>
          <Text style={{color:"#999",fontSize:18}}>›</Text>
        </TouchableOpacity>
      </View>
      */}
      <View style={s.settCard}>
        <Text style={s.settSec}>{t.suggestSettings}</Text>
        {settingRows.map(([key,lb,sub])=>(
          <View key={key} style={s.settRow}>
            <View style={{flex:1}}>
              <Text style={s.settLabel}>{lb}</Text>
              <Text style={s.settRowSub}>{sub}</Text>
            </View>
            <TouchableOpacity style={[s.tog,settings[key]&&s.togOn]} onPress={()=>toggle(key)}>
              <View style={[s.togThumb,settings[key]&&s.togThumbOn]}/>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      {/* TODO: 認証復活時に戻す（サインアウト）
      <TouchableOpacity style={[s.settCard,{marginTop:16,marginBottom:20,alignItems:"center"}]} onPress={signOut}>
        <Text style={{color:"#E53935",fontSize:14,fontWeight:"600"}}>{t.signOut}</Text>
      </TouchableOpacity>
      */}
    </ScrollView>
  );
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:"#FAFAF7"},
  bar:{flexDirection:"row",backgroundColor:"#FAFAF7",borderTopWidth:1,borderTopColor:"#E8E8E0",paddingBottom:8,paddingTop:4},
  barBtn:{flex:1,alignItems:"center",paddingVertical:6,borderRadius:12,marginHorizontal:4},
  barBtnOn:{backgroundColor:BRAND},
  barLabel:{fontSize:9,color:"#999",marginTop:2},
  barLabelOn:{color:"#fff",fontWeight:"700"},
  hdr:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-end",padding:20,paddingBottom:12},
  hdrSub:{fontSize:11,color:"#999",letterSpacing:1,marginBottom:4},
  hdrTitle:{fontSize:28,fontWeight:"400",color:"#1a1a1a",letterSpacing:-0.5},
  addBtn:{width:44,height:44,borderRadius:22,backgroundColor:BRAND,alignItems:"center",justifyContent:"center"},
  chip:{paddingHorizontal:14,paddingVertical:6,borderRadius:20,borderWidth:1.5,borderColor:"#E0E0D8",backgroundColor:"#fff",marginRight:8},
  chipOn:{backgroundColor:BRAND,borderColor:BRAND},
  chipTxt:{fontSize:12,color:"#666"},
  chipTxtOn:{color:"#fff"},
  grid:{flexDirection:"row",flexWrap:"wrap",paddingHorizontal:16,gap:12},
  card:{width:"47%",backgroundColor:"#fff",borderRadius:20,padding:14,borderWidth:1,borderColor:"#E8E8E0"},
  cardImg:{width:"100%",aspectRatio:1,borderRadius:14,alignItems:"center",justifyContent:"center",marginBottom:10,resizeMode:"cover"},
  cardName:{fontSize:13,fontWeight:"600",color:"#1a1a1a"},
  cardSub:{fontSize:10,color:"#999",marginTop:2},
  badge:{position:"absolute",top:10,right:10,backgroundColor:"#F0EDE8",borderRadius:8,paddingHorizontal:6,paddingVertical:2},
  badgeTxt:{fontSize:9,color:"#888"},
  detailImg:{width:"100%",aspectRatio:1,borderRadius:20,marginBottom:16,resizeMode:"cover"},
  detailIcon:{width:"100%",aspectRatio:1,borderRadius:20,alignItems:"center",justifyContent:"center",marginBottom:16},
  detailName:{fontSize:22,fontWeight:"700",color:"#1a1a1a",marginBottom:16},
  detailInfoBox:{backgroundColor:"#F5F4F0",borderRadius:16,marginBottom:24,overflow:"hidden"},
  detailRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingHorizontal:16,paddingVertical:13,borderBottomWidth:1,borderBottomColor:"#EBEBE6"},
  detailRowLabel:{fontSize:13,color:"#999"},
  detailRowValue:{fontSize:13,fontWeight:"600",color:"#1a1a1a",flexShrink:1,textAlign:"right",marginLeft:16},
  deleteBtn:{backgroundColor:"#E53935",borderRadius:20,padding:16,alignItems:"center"},
  deleteTxt:{color:"#fff",fontSize:16,fontWeight:"600"},
  overlay:{flex:1,backgroundColor:"rgba(0,0,0,0.6)",justifyContent:"flex-end"},
  sheet:{backgroundColor:"#FAFAF7",borderTopLeftRadius:32,borderTopRightRadius:32,padding:28,paddingBottom:48},
  handle:{width:40,height:4,backgroundColor:"#DDD",borderRadius:2,alignSelf:"center",marginBottom:20},
  sheetTitle:{fontSize:20,fontWeight:"700",color:"#1a1a1a",marginBottom:20},
  sheetOpt:{flex:1,padding:16,borderWidth:1.5,borderColor:"#E8E8E0",borderRadius:16,alignItems:"center",gap:6,backgroundColor:"#fff"},
  sheetOptTxt:{fontSize:12,color:"#333",textAlign:"center",marginTop:4},
  cancelBtn:{backgroundColor:BRAND,borderRadius:20,padding:16,alignItems:"center"},
  cancelTxt:{color:"#fff",fontSize:16,fontWeight:"600"},
  previewImg:{width:"100%",aspectRatio:1,borderRadius:16,marginBottom:16,resizeMode:"cover"},
  inputLabel:{fontSize:13,fontWeight:"600",color:"#1a1a1a",marginBottom:8},
  nameInput:{borderWidth:1.5,borderColor:"#E0E0D8",borderRadius:12,paddingHorizontal:14,paddingVertical:12,fontSize:15,color:"#1a1a1a",backgroundColor:"#fff",marginBottom:12},
  darkHdr:{backgroundColor:BRAND,padding:20,paddingBottom:16},
  darkSub:{fontSize:11,color:"rgba(255,255,255,0.5)",letterSpacing:1,marginBottom:4},
  darkTitle:{fontSize:28,fontWeight:"400",color:"#fff"},
  darkWeather:{fontSize:13,color:"rgba(255,255,255,0.6)",marginTop:4},
  tpoChip:{paddingHorizontal:14,paddingVertical:6,borderRadius:20,borderWidth:1.5,borderColor:"rgba(255,255,255,0.25)",marginRight:8},
  tpoChipOn:{backgroundColor:"#fff",borderColor:"#fff"},
  tpoTxt:{fontSize:12,color:"rgba(255,255,255,0.7)"},
  tpoTxtOn:{color:BRAND,fontWeight:"700"},
  coCard:{backgroundColor:"#fff",borderRadius:24,marginBottom:16,borderWidth:1,borderColor:"#E8E8E0",overflow:"hidden"},
  coCardOn:{borderColor:BRAND,borderWidth:2},
  coHdr:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",padding:16,paddingBottom:12},
  tpoBadge:{backgroundColor:"#F0EDE8",borderRadius:20,paddingHorizontal:10,paddingVertical:3,alignSelf:"flex-start",marginBottom:4},
  tpoBadgeTxt:{fontSize:11,color:"#666"},
  coWeather:{fontSize:11,color:"#999"},
  score:{width:52,height:52,borderRadius:26,backgroundColor:"#F0EDE8",alignItems:"center",justifyContent:"center"},
  scoreTxt:{fontSize:16,fontWeight:"700",color:BRAND},
  coItems:{flexDirection:"row",gap:8,paddingHorizontal:16,paddingBottom:16},
  coItem:{flex:1,height:58,borderRadius:14,alignItems:"center",justifyContent:"center",overflow:"hidden"},
  coDetail:{borderTopWidth:1,borderTopColor:"#F0EDE8",padding:16},
  coComment:{fontSize:13,color:"#555",lineHeight:20},
  regenBtn:{backgroundColor:BRAND,borderRadius:20,padding:18,alignItems:"center"},
  regenTxt:{color:"#fff",fontSize:16,fontWeight:"600"},
  settCard:{backgroundColor:"#fff",borderRadius:20,marginHorizontal:20,padding:20,borderWidth:1,borderColor:"#E8E8E0"},
  settSec:{fontSize:13,fontWeight:"700",color:"#1a1a1a",marginBottom:14},
  settTitle:{fontSize:15,fontWeight:"600",color:"#1a1a1a"},
  settSub:{fontSize:12,color:"#999",marginTop:2},
  settRow:{flexDirection:"row",alignItems:"center",paddingVertical:12,borderBottomWidth:1,borderBottomColor:"#F5F5F0"},
  settLabel:{fontSize:14,color:"#333"},
  settRowSub:{fontSize:11,color:"#999",marginTop:2},
  shareRow:{flexDirection:"row",alignItems:"center",paddingVertical:4},
  tog:{width:44,height:26,borderRadius:13,backgroundColor:"#DDD",padding:3,justifyContent:"center"},
  togOn:{backgroundColor:BRAND},
  togThumb:{width:20,height:20,borderRadius:10,backgroundColor:"#fff",alignSelf:"flex-start"},
  togThumbOn:{alignSelf:"flex-end"},
  avatar:{width:48,height:48,borderRadius:24,backgroundColor:BRAND,alignItems:"center",justifyContent:"center"},
});
