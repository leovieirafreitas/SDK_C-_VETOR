// GradientManipulator.cpp v10 — RECUPERADO COM VETORES NATIVOS (Zero Reconstrucao)
// CENTER+ANGLE: resolve o problema de fc.origin com offset do artboard.
// Para angle!=0: calcula o start/end centrado na shape, na direcao do angulo.
// Para angle==0 (gradient tool): usa native .ai import com conversao de coords.

#include "AEConfig.h"
#ifdef AE_OS_WIN
    #include <windows.h>
#endif
#include "AE_GeneralPlug.h"
#include "AE_Macros.h"
#include "AEGP_SuiteHandler.h"
#include <string>
#include <fstream>
#include <sstream>
#include <vector>

static AEGP_PluginID S_my_id = 0L;
static SPBasicSuite  *sP     = NULL;
static AEGP_Command  S_cmd   = 0L;

struct ColorStop { float pos, r, g, b; };
struct GradShape  {
    std::string name;
    float angle, gsX, gsY, geX, geY;
    std::vector<ColorStop> stops;
};

static void ReplaceAll(std::string& s, const std::string& f, const std::string& t) {
    if (f.empty()) return;
    size_t p = 0;
    while ((p = s.find(f, p)) != std::string::npos) { s.replace(p, f.length(), t); p += t.length(); }
}
static std::string F(float v) {
    if (v == 0.0f) return "0"; if (v == 1.0f) return "1";
    char b[32]; sprintf_s(b, "%.6f", v);
    std::string s(b); size_t d = s.find('.');
    if (d != std::string::npos) {
        size_t l = s.find_last_not_of('0');
        if (l != std::string::npos && l > d) s = s.substr(0, l+1);
        else if (l == d) s = s.substr(0, d);
    }
    return s;
}

static std::string GenerateGCky(const std::vector<ColorStop>& stops) {
    const std::string nl = "&#xA;", lt = "&lt;", gt = "&gt;", ap = "&apos;";
    int n = (int)stops.size(); if (n < 2) n = 2;
    std::string x;
    x += lt+"?xml version="+ap+"1.0"+ap+"?"+gt+nl;
    x += lt+"prop.map version="+ap+"4"+ap+gt+nl;
    x += lt+"prop.list"+gt+nl+lt+"prop.pair"+gt+nl;
    x += lt+"key"+gt+"Gradient Color Data"+lt+"/key"+gt+nl;
    x += lt+"prop.list"+gt+nl;
    x += lt+"prop.pair"+gt+nl+lt+"key"+gt+"Alpha Stops"+lt+"/key"+gt+nl;
    x += lt+"prop.list"+gt+nl+lt+"prop.pair"+gt+nl+lt+"key"+gt+"Stops List"+lt+"/key"+gt+nl;
    x += lt+"prop.list"+gt+nl;
    for (int i=0;i<n;i++) {
        float p=(i<(int)stops.size())?stops[i].pos:(i==0?0.f:1.f);
        x += lt+"prop.pair"+gt+nl+lt+"key"+gt+"Stop-"+std::to_string(i)+lt+"/key"+gt+nl;
        x += lt+"prop.list"+gt+nl+lt+"prop.pair"+gt+nl+lt+"key"+gt+"Stops Alpha"+lt+"/key"+gt+nl;
        x += lt+"array"+gt+nl+lt+"array.type"+gt+lt+"float/"+gt+lt+"/array.type"+gt+nl;
        x += lt+"float"+gt+F(p)+lt+"/float"+gt+nl;
        x += lt+"float"+gt+"0.5"+lt+"/float"+gt+nl;
        x += lt+"float"+gt+"1"+lt+"/float"+gt+nl;
        x += lt+"/array"+gt+nl+lt+"/prop.pair"+gt+nl+lt+"/prop.list"+gt+nl+lt+"/prop.pair"+gt+nl;
    }
    x += lt+"/prop.list"+gt+nl+lt+"/prop.pair"+gt+nl;
    x += lt+"prop.pair"+gt+nl+lt+"key"+gt+"Stops Size"+lt+"/key"+gt+nl;
    x += lt+"int type="+ap+"unsigned"+ap+" size="+ap+"32"+ap+gt+std::to_string(n)+lt+"/int"+gt+nl;
    x += lt+"/prop.pair"+gt+nl+lt+"/prop.list"+gt+nl+lt+"/prop.pair"+gt+nl;
    x += lt+"prop.pair"+gt+nl+lt+"key"+gt+"Color Stops"+lt+"/key"+gt+nl;
    x += lt+"prop.list"+gt+nl+lt+"prop.pair"+gt+nl+lt+"key"+gt+"Stops List"+lt+"/key"+gt+nl;
    x += lt+"prop.list"+gt+nl;
    for (int i=0;i<n;i++) {
        float pos=(i<(int)stops.size())?stops[i].pos:(i==0?0.f:1.f);
        float r=(i<(int)stops.size())?stops[i].r:0.f;
        float g=(i<(int)stops.size())?stops[i].g:0.f;
        float b=(i<(int)stops.size())?stops[i].b:0.f;
        x += lt+"prop.pair"+gt+nl+lt+"key"+gt+"Stop-"+std::to_string(i)+lt+"/key"+gt+nl;
        x += lt+"prop.list"+gt+nl+lt+"prop.pair"+gt+nl+lt+"key"+gt+"Stops Color"+lt+"/key"+gt+nl;
        x += lt+"array"+gt+nl+lt+"array.type"+gt+lt+"float/"+gt+lt+"/array.type"+gt+nl;
        x += lt+"float"+gt+F(pos)+lt+"/float"+gt+nl;
        x += lt+"float"+gt+"0.5"+lt+"/float"+gt+nl;
        x += lt+"float"+gt+F(r)+lt+"/float"+gt+nl;
        x += lt+"float"+gt+F(g)+lt+"/float"+gt+nl;
        x += lt+"float"+gt+F(b)+lt+"/float"+gt+nl;
        x += lt+"float"+gt+"1"+lt+"/float"+gt+nl;
        x += lt+"/array"+gt+nl+lt+"/prop.pair"+gt+nl+lt+"/prop.list"+gt+nl+lt+"/prop.pair"+gt+nl;
    }
    x += lt+"/prop.list"+gt+nl+lt+"/prop.pair"+gt+nl;
    x += lt+"prop.pair"+gt+nl+lt+"key"+gt+"Stops Size"+lt+"/key"+gt+nl;
    x += lt+"int type="+ap+"unsigned"+ap+" size="+ap+"32"+ap+gt+std::to_string(n)+lt+"/int"+gt+nl;
    x += lt+"/prop.pair"+gt+nl+lt+"/prop.list"+gt+nl+lt+"/prop.pair"+gt+nl;
    x += lt+"prop.pair"+gt+nl+lt+"key"+gt+"Gradient Colors"+lt+"/key"+gt+nl;
    x += lt+"string"+gt+"1.0"+lt+"/string"+gt+nl;
    x += lt+"/prop.pair"+gt+nl+lt+"/prop.list"+gt+nl+lt+"/prop.pair"+gt+nl;
    x += lt+"/prop.list"+gt+nl+lt+"/prop.map"+gt+nl;
    return x;
}

static bool WriteAEPX(const std::vector<ColorStop>& stops, const std::string& outPath) {
    std::ifstream tp("C:\\AEGP\\gradient_template.aepx", std::ios::binary);
    if (!tp.is_open()) return false;
    std::ostringstream ss; ss << tp.rdbuf(); tp.close();
    std::string aepx = ss.str();
    std::string gky = GenerateGCky(stops);
    size_t gkyStart = aepx.find("<GCky>"), gkyEnd = aepx.find("</GCky>");
    if (gkyStart != std::string::npos && gkyEnd != std::string::npos) {
        size_t sS = aepx.find("<string>", gkyStart), sE = aepx.find("</string>", sS);
        if (sS != std::string::npos && sE != std::string::npos && sS < gkyEnd)
            aepx = aepx.substr(0, sS) + "<string>" + gky + "</string>" + aepx.substr(sE + 9);
    }
    std::ofstream out(outPath, std::ios::binary);
    if (!out.is_open()) return false;
    out << aepx; out.close(); return true;
}

static bool ParseGradJSON(const std::string& js, std::vector<GradShape>& shapes) {
    size_t p = 0;
    while (true) {
        size_t sn = js.find("\"name\"", p); if (sn == std::string::npos) break;
        size_t q1 = js.find('"', sn+7)+1, q2 = js.find('"', q1);
        std::string shapeName = js.substr(q1, q2-q1);
        size_t nextName = js.find("\"name\"", q2+1);
        size_t scopeEnd = (nextName != std::string::npos) ? nextName : js.size();
        size_t ftPos = js.find("\"fillType\"", sn);
        if (ftPos != std::string::npos && ftPos < scopeEnd) {
            size_t fvS = js.find('"', js.find(':', ftPos)+1)+1, fvE = js.find('"', fvS);
            if (js.substr(fvS, fvE-fvS) != "gradient") { p = scopeEnd; continue; }
        }
        size_t gn = js.find("\"gradient\"", sn);
        if (gn == std::string::npos || gn >= scopeEnd) { p = scopeEnd; continue; }
        GradShape gs; gs.name = shapeName;
        auto num = [&](const std::string& key, size_t from) -> float {
            size_t kp = js.find(key, from); if (kp == std::string::npos || kp >= scopeEnd) return 0.f;
            size_t cp = js.find(':', kp)+1;
            while (cp < js.size() && (js[cp]==' '||js[cp]=='\n'||js[cp]=='\r')) cp++;
            try { return (float)std::stod(js.substr(cp, 30)); } catch(...) { return 0.f; }
        };
        gs.angle = num("\"angle\"", gn);
        gs.gsX = num("\"startX\"", gn); gs.gsY = num("\"startY\"", gn);
        gs.geX = num("\"endX\"", gn);   gs.geY = num("\"endY\"", gn);
        size_t stA = js.find("\"stops\"", gn), stB = js.find('[', stA), stE = js.find(']', stB);
        if (stA == std::string::npos || stB == std::string::npos) { p = scopeEnd; continue; }
        std::string stSub = js.substr(stB+1, stE-stB-1);
        size_t q = 0;
        while (true) {
            size_t ob = stSub.find('{', q); if (ob == std::string::npos) break;
            size_t cb = stSub.find('}', ob); std::string ent = stSub.substr(ob, cb-ob+1);
            ColorStop cs;
            auto ev = [&](const std::string& k) -> float {
                size_t kp = ent.find(k); if (kp == std::string::npos) return 0.f;
                size_t cp = ent.find(':', kp)+1;
                while (cp < ent.size() && (ent[cp]==' '||ent[cp]=='\n')) cp++;
                try { return (float)std::stod(ent.substr(cp, 20)); } catch(...) { return 0.f; }
            };
            cs.pos = ev("\"pos\""); cs.r = ev("\"r\""); cs.g = ev("\"g\""); cs.b = ev("\"b\"");
            gs.stops.push_back(cs); q = cb+1;
        }
        shapes.push_back(gs); p = stE+1;
    }
    return !shapes.empty();
}

static void ParseAiPath(const std::string& js, std::string& aiPath) {
    aiPath = "";
    size_t ap = js.find("\"aiPath\""); if (ap == std::string::npos) return;
    size_t q1 = js.find('"', ap+9); if (q1 == std::string::npos) return; q1++;
    size_t q2 = js.find('"', q1);   if (q2 == std::string::npos) return;
    aiPath = js.substr(q1, q2-q1);
    for (char& c : aiPath) if (c == '\\') c = '/';
}

static A_Err ApplyGradientsToExistingLayers(AEGP_SuiteHandler& suites) {
    std::ifstream jf("C:\\AEGP\\grad_data.json");
    if (!jf.is_open()) {
        suites.UtilitySuite3()->AEGP_ReportInfo(S_my_id,
            "ERRO: C:\\AEGP\\grad_data.json nao encontrado!\nRode ExtrairGradiente.jsx primeiro.");
        return A_Err_NONE;
    }
    std::ostringstream jsonss; jsonss << jf.rdbuf(); jf.close();
    std::string jsonStr = jsonss.str();

    std::vector<GradShape> shapes;
    if (!ParseGradJSON(jsonStr, shapes)) {
        suites.UtilitySuite3()->AEGP_ReportInfo(S_my_id,
            "AVISO: Nenhum gradiente no JSON.\n"
            "Shapes solidas importadas pelo SimularOverlord.");
        return A_Err_NONE;
    }
    std::string aiPath; ParseAiPath(jsonStr, aiPath);

    for (int si = 0; si < (int)shapes.size(); si++) {
        std::string out = "C:\\AEGP\\grad_" + std::to_string(si) + ".aepx";
        if (!WriteAEPX(shapes[si].stops, out)) {
            suites.UtilitySuite3()->AEGP_ReportInfo(S_my_id, "ERRO ao gerar AEPX.");
            return A_Err_GENERIC;
        }
    }

    std::string gradJS = "[";
    for (int si = 0; si < (int)shapes.size(); si++) {
        if (si > 0) gradJS += ",";
        gradJS += "{name:'" + shapes[si].name + "'";
        gradJS += ",aepx:'C:/AEGP/grad_" + std::to_string(si) + ".aepx'";
        gradJS += ",angle:" + F(shapes[si].angle);
        gradJS += ",gsX:" + F(shapes[si].gsX) + ",gsY:" + F(shapes[si].gsY);
        gradJS += ",geX:" + F(shapes[si].geX) + ",geY:" + F(shapes[si].geY);
        gradJS += "}";
    }
    gradJS += "]";

    // ─── ExtendScript gerado ───────────────────────────────────────────────────
    std::string js;
    js += "(function(){try{";
    js += "var grads=" + gradJS + ";";
    js += "var aiPath='" + aiPath + "';";
    js += "var comp=app.project.activeItem;if(!comp||!(comp instanceof CompItem)){alert('Abra uma comp!');return;}var applied=0;for";
    js += "(var gi=0;gi<grads.length;gi++){  var gd=grads[gi];  var origLyr=null;  for(var li=1;li<=comp.numLayers;li++){    if(com";
    js += "p.layer(li).name===gd.name){origLyr=comp.layer(li);break;}  }  if(!origLyr){continue;}  var shapeVal=null;  try{    var ";
    js += "origRoot=origLyr.property('ADBE Root Vectors Group');    for(var j=1;j<=origRoot.numProperties;j++){      var origGrp=or";
    js += "igRoot.property(j);      if(origGrp.matchName!=='ADBE Vector Group')continue;      var origCont=origGrp.property('ADBE V";
    js += "ectors Group');      for(var k=1;k<=origCont.numProperties;k++){        var origP=origCont.property(k);        if(origP.";
    js += "matchName==='ADBE Vector Shape - Group'){          shapeVal=origP.property('ADBE Vector Shape').value;          break;  ";
    js += "      }      }      if(shapeVal)break;    }  }catch(er){}  if(!shapeVal||shapeVal.vertices.length<2){continue;}  var f=n";
    js += "ew File(gd.aepx);  if(!f.exists)continue;  var imp=app.project.importFile(new ImportOptions(f));  var gc=null;  if(imp i";
    js += "nstanceof FolderItem){for(var ii=1;ii<=imp.numItems;ii++){if(imp.item(ii) instanceof CompItem){gc=imp.item(ii);break;}}}";
    js += "  else if(imp instanceof CompItem){gc=imp;}  if(!gc||gc.numLayers<1){try{if(imp instanceof FolderItem)imp.remove();}catc";
    js += "h(e){} continue;}  gc.layer(1).copyToComp(comp);  var newLyr=comp.layer(1); newLyr.name=gd.name+' (grad)';  var root=new";
    js += "Lyr.property('ADBE Root Vectors Group'),grp=null;  for(var j=1;j<=root.numProperties;j++){    var pg=root.property(j);  ";
    js += "  if(pg.matchName==='ADBE Vector Group'){grp=pg.property('ADBE Vectors Group');break;}  }  if(!grp){try{gc.remove();}cat";
    js += "ch(e){} continue;}  var toRemove=[];  for(var k=1;k<=grp.numProperties;k++){    var pm=grp.property(k);    if(pm.matchNa";
    js += "me!=='ADBE Vector Graphic - G-Fill'&&       pm.matchName!=='ADBE Vector Transform Group'){      toRemove.push(pm);    } ";
    js += " }  for(var ri=0;ri<toRemove.length;ri++){try{toRemove[ri].remove();}catch(er){}}  var successGrad=false;  try{  var new";
    js += "P=grp.addProperty('ADBE Vector Shape - Group');  newP.property('ADBE Vector Shape').setValue(shapeVal);  newP.moveTo(1);";
    js += "  successGrad=true;  }catch(eInj){successGrad=false;}  if(successGrad){  var gfill=null;  for(var g=1;g<=grp.numProperti";
    js += "es;g++){if(grp.property(g).matchName==='ADBE Vector Graphic - G-Fill'){gfill=grp.property(g);break;}}  if(gfill){    try";
    js += "{gfill.property('Ponto inicial').setValue([gd.gsX,gd.gsY]);}catch(e){try{gfill.property('ADBE Vector Grad Start').setVal";
    js += "ue([gd.gsX,gd.gsY]);}catch(e2){}}    try{gfill.property('Ponto final').setValue([gd.geX,gd.geY]);}catch(e){try{gfill.pro";
    js += "perty('ADBE Vector Grad End').setValue([gd.geX,gd.geY]);}catch(e2){}}  }  var origTr=origLyr.property('ADBE Transform Gr";
    js += "oup');  var origPos=origTr.property('ADBE Position').value;  var origAnch=origTr.property('ADBE Anchor Point').value;";
    js += "  var origOpac=origTr.property('ADBE Opacity').value; var newTr=newLyr.property('ADBE Transform Group'); try{if(origLy";
    js += "r.parent) newLyr.parent=origLyr.parent;}catch(ep){} newTr.property('ADBE Anchor Point').setValue(origAnch); newTr.prop";
    js += "erty('ADBE Position').setValue(origPos); try{newTr.property('ADBE Opacity').setValue(origOpac);}catch(eop){} try{ var r";
    js += "ootVec2=newLyr.property('ADBE Root Vectors Group'); for(var rv=1";
    js += ";rv<=rootVec2.numProperties;rv++){      var rvp=rootVec2.property(rv);      if(rvp.matchName==='ADBE Vector Group'){    ";
    js += "    var vgt2=rvp.property('ADBE Vector Transform Group');        if(vgt2){          try{vgt2.property('ADBE Vector Ancho";
    js += "r').setValue([0,0]);}catch(ea){}          try{vgt2.property('ADBE Vector Position').setValue([0,0]);}catch(ep){}        ";
    js += "  try{vgt2.property('ADBE Vector Scale').setValue([100,100]);}catch(es){}          try{vgt2.property('ADBE Vector Rotati";
    js += "on').setValue(0);}catch(er){}        }      }    }  }catch(evgt){}  try{newLyr.moveBefore(origLyr);}catch(em){} try{origLyr.remove();}catch(e){}  applied++;  } else";
    js += " {  try{newLyr.remove();}catch(e){}  }  try{gc.remove();}catch(e){} try{if(imp instanceof FolderItem)imp.remove();}catch";
    js += "(e){}}comp.openInViewer();alert('GRAD FIXER CONCLUIDO!\\n'+applied+' gradientes aplicados\\n'  +'Paths copiados das layers";
    js += " originais (zero reconstrucao!)');";
    js += "}catch(e){alert(\'ERRO: \'+e.message+\' (L\'+e.line+\')\');}})();";
    char* buf = (char*)malloc(js.length() + 1);
    if (buf) {
        strcpy_s(buf, js.length() + 1, js.c_str());
        AEGP_MemHandle resH = NULL, errH = NULL;
        suites.UtilitySuite6()->AEGP_ExecuteScript(S_my_id, buf, FALSE, &resH, &errH);
        if (resH) suites.MemorySuite1()->AEGP_FreeMemHandle(resH);
        if (errH) suites.MemorySuite1()->AEGP_FreeMemHandle(errH);
        free(buf);
    }
    return A_Err_NONE;
}

static A_Err CommandHook(AEGP_GlobalRefcon, AEGP_CommandRefcon, AEGP_Command cmd,
                          AEGP_HookPriority, A_Boolean, A_Boolean* handled) {
    if (cmd == S_cmd) { *handled = TRUE; AEGP_SuiteHandler suites(sP); return ApplyGradientsToExistingLayers(suites); }
    return A_Err_NONE;
}
static A_Err UpdateMenuHook(AEGP_GlobalRefcon, AEGP_UpdateMenuRefcon, AEGP_WindowType) {
    AEGP_SuiteHandler suites(sP); suites.CommandSuite1()->AEGP_EnableCommand(S_cmd); return A_Err_NONE;
}
extern "C" __declspec(dllexport)
A_Err EntryPointFunc(struct SPBasicSuite* pica, A_long, A_long, AEGP_PluginID id, AEGP_GlobalRefcon*) {
    S_my_id = id; sP = pica;
    AEGP_SuiteHandler suites(pica);
    suites.CommandSuite1()->AEGP_GetUniqueCommand(&S_cmd);
    suites.CommandSuite1()->AEGP_InsertMenuCommand(S_cmd,
        "GRAD FIXER: Aplicar Gradientes", AEGP_Menu_LAYER, AEGP_MENU_INSERT_AT_BOTTOM);
    suites.RegisterSuite5()->AEGP_RegisterCommandHook(S_my_id, AEGP_HP_BeforeAE, AEGP_Command_ALL, CommandHook, 0);
    suites.RegisterSuite5()->AEGP_RegisterUpdateMenuHook(S_my_id, UpdateMenuHook, 0);
    return A_Err_NONE;
}