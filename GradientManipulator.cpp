// GradientManipulator.cpp v9 — Smart Gradient Positioning
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
    js += "var comp=app.project.activeItem;";
    js += "if(!comp||!(comp instanceof CompItem)){alert('Abra uma comp!');return;}";

    // Importar .ai nativo (para angle=0 → gradient tool)
    js += "var tempComp=null,tempImpItem=null;";
    js += "try{var aiFile=new File(aiPath);if(aiFile.exists){";
    js += "  var aiOpts=new ImportOptions(aiFile);";
    js += "  aiOpts.importAs=ImportAsType.COMP_CROPPED_LAYERS;";
    js += "  tempImpItem=app.project.importFile(aiOpts);";
    js += "  if(tempImpItem instanceof CompItem){tempComp=tempImpItem;}";
    js += "  else if(tempImpItem instanceof FolderItem){";
    js += "    for(var ti=1;ti<=tempImpItem.numItems;ti++){";
    js += "      if(tempImpItem.item(ti) instanceof CompItem){tempComp=tempImpItem.item(ti);break;}";
    js += "    }";
    js += "  }";
    js += "}}catch(eAI){}";

    js += "function findGFill(lyr){try{";
    js += "  var r=lyr.property('ADBE Root Vectors Group');";
    js += "  for(var j=1;j<=r.numProperties;j++){";
    js += "    var g=r.property(j);if(g.matchName!=='ADBE Vector Group')continue;";
    js += "    var c=g.property('ADBE Vectors Group');";
    js += "    for(var k=1;k<=c.numProperties;k++){";
    js += "      if(c.property(k).matchName==='ADBE Vector Graphic - G-Fill')return c.property(k);";
    js += "    }";
    js += "  }";
    js += "}catch(e){}return null;}";

    // ─── CENTER+ANGLE helper ─────────────────────────────────────────────────
    // Posiciona o gradiente CENTRADO na shape na direcao do angulo.
    // Formula: dir = [cos(a), -sin(a)] em AE (Y flipado vs AI)
    //   start = center - half*dir
    //   end   = center + half*dir
    // Funciona para QUALQUER angulo (-90, 45, 0, etc.) independente de fc.origin
    js += "function gradByAngle(mnX,mxX,mnY,mxY,ang){";
    js += "  var cx=(mnX+mxX)/2,cy=(mnY+mxY)/2;";
    js += "  var half=Math.max(mxX-mnX,mxY-mnY)*0.55;";
    js += "  var rad=ang*Math.PI/180;";
    js += "  var dX=Math.cos(rad),dY=-Math.sin(rad);";  // Y flipado AI→AE
    js += "  return[[cx-half*dX,cy-half*dY],[cx+half*dX,cy+half*dY]];";
    js += "}";

    js += "var applied=0,methodLog='';";
    js += "for(var gi=0;gi<grads.length;gi++){";
    js += "var gd=grads[gi];";

    js += "var origLyr=null;";
    js += "for(var li=1;li<=comp.numLayers;li++){";
    js += "  if(comp.layer(li).name===gd.name){origLyr=comp.layer(li);break;}";
    js += "}";

    // ── STEP 1: Calcular bounds da shape (necessario para validacao e fallback) ──
    js += "var mnX=0,mxX=100,mnY=0,mxY=100,gotBounds=false,sv_cached=null;";
    js += "if(origLyr){try{";
    js += "  var bR=origLyr.property('ADBE Root Vectors Group');";
    js += "  for(var bj=1;bj<=bR.numProperties;bj++){";
    js += "    if(bR.property(bj).matchName!=='ADBE Vector Group')continue;";
    js += "    var bC=bR.property(bj).property('ADBE Vectors Group');";
    js += "    for(var bk=1;bk<=bC.numProperties;bk++){";
    js += "      if(bC.property(bk).matchName!=='ADBE Vector Shape - Group')continue;";
    js += "      sv_cached=bC.property(bk).property('ADBE Vector Shape').value.vertices;";
    js += "      mnX=sv_cached[0][0];mxX=sv_cached[0][0];mnY=sv_cached[0][1];mxY=sv_cached[0][1];";
    js += "      for(var bvi=1;bvi<sv_cached.length;bvi++){";
    js += "        if(sv_cached[bvi][0]<mnX)mnX=sv_cached[bvi][0];";
    js += "        if(sv_cached[bvi][0]>mxX)mxX=sv_cached[bvi][0];";
    js += "        if(sv_cached[bvi][1]<mnY)mnY=sv_cached[bvi][1];";
    js += "        if(sv_cached[bvi][1]>mxY)mxY=sv_cached[bvi][1];";
    js += "      }gotBounds=true;break;";
    js += "    }if(gotBounds)break;";
    js += "  }";
    js += "}catch(eBnds){}}";

    // ── STEP 2: Determinar posicoes do gradiente ──────────────────────────────
    js += "var gradStart=null,gradEnd=null,posMethod='none';";

    // METODO 1: angle != 0 (gradiente do painel)
    //   Usa center+angle, mas valida primeiro se formula do fc.origin+fc.angle
    //   esta dentro do range da shape (para aproveitar quando esta correto)
    js += "if(Math.abs(gd.angle)>0.5&&gotBounds){";
    js += "  var margin=Math.max(mxX-mnX,mxY-mnY)*3;";
    js += "  var formulaOK=gd.gsX>=mnX-margin&&gd.gsX<=mxX+margin&&";
    js += "                gd.gsY>=mnY-margin&&gd.gsY<=mxY+margin;";
    js += "  if(formulaOK){";
    // Formula fc.origin+fc.angle dentro do range: usa ela (mais precisa)
    js += "    gradStart=[gd.gsX,gd.gsY];gradEnd=[gd.geX,gd.geY];";
    js += "    posMethod='formula_panel';";
    js += "  }else{";
    // fc.origin fora do range (offset artboard): center+angle
    js += "    var ca=gradByAngle(mnX,mxX,mnY,mxY,gd.angle);";
    js += "    gradStart=ca[0];gradEnd=ca[1];";
    js += "    posMethod='center+angle('+Math.round(gd.angle)+'deg)';";
    js += "  }";
    js += "}";

    // METODO 2: angle==0 (gradient tool) → native .ai import + conversao coords
    // comp = (local - anchor) * scale + position
    // VALIDAR: coords devem estar razoavelmente perto dos bounds da shape
    js += "if(!gradStart&&tempComp){";
    js += "  for(var li=1;li<=tempComp.numLayers;li++){";
    js += "    if(tempComp.layer(li).name===gd.name){";
    js += "      var gf=findGFill(tempComp.layer(li));";
    js += "      if(gf){try{";
    js += "        var nTr=tempComp.layer(li).property('ADBE Transform Group');";
    js += "        var nPos=nTr.property('ADBE Position').value;";
    js += "        var nAnch=nTr.property('ADBE Anchor Point').value;";
    js += "        var nScl=nTr.property('ADBE Scale').value;";
    js += "        var sx=nScl[0]/100,sy=nScl[1]/100;";
    js += "        var gfS=gf.property('ADBE Vector Grad Start').value;";
    js += "        var gfE=gf.property('ADBE Vector Grad End').value;";
    js += "        var csx=(gfS[0]-nAnch[0])*sx+nPos[0];";
    js += "        var csy=(gfS[1]-nAnch[1])*sy+nPos[1];";
    js += "        var cex=(gfE[0]-nAnch[0])*sx+nPos[0];";
    js += "        var cey=(gfE[1]-nAnch[1])*sy+nPos[1];";
    // VALIDAR coords dentro do alcance da shape (evita X=12800 para shape em X=300)
    js += "        var natM=Math.max(mxX-mnX,mxY-mnY)*3;";
    js += "        var natOK=isFinite(csx)&&isFinite(csy)&&";
    js += "                   csx>=mnX-natM&&csx<=mxX+natM&&";
    js += "                   csy>=mnY-natM&&csy<=mxY+natM;";
    js += "        if(natOK){";
    js += "          gradStart=[csx,csy];gradEnd=[cex,cey];posMethod='native_ai';";
    js += "        }";
    js += "      }catch(eN){}}break;";
    js += "    }";
    js += "  }";
    js += "}";



    // METODO 3: fallback final
    js += "if(!gradStart&&gotBounds){";
    js += "  if(Math.abs(gd.angle)>0.5){";
    js += "    var fc=gradByAngle(mnX,mxX,mnY,mxY,gd.angle);";
    js += "    gradStart=fc[0];gradEnd=fc[1];posMethod='fallback+angle';";
    js += "  }else if((mxY-mnY)>(mxX-mnX)*1.2){";
    js += "    var cx2=(mnX+mxX)/2;";
    js += "    gradStart=[cx2,mnY];gradEnd=[cx2,mxY];posMethod='fallback_vertical';";
    js += "  }else{";
    js += "    gradStart=[mnX,mnY];gradEnd=[mxX,mxY];posMethod='fallback_diagonal';";
    js += "  }";
    js += "}";

    // ── STEP 3: Importar AEPX (cores) e injetar path + posicoes ──────────────
    js += "var f=new File(gd.aepx);if(!f.exists)continue;";
    js += "var imp=app.project.importFile(new ImportOptions(f));";
    js += "var gc=null;";
    js += "if(imp instanceof FolderItem){for(var ii=1;ii<=imp.numItems;ii++){if(imp.item(ii) instanceof CompItem){gc=imp.item(ii);break;}}}";
    js += "else if(imp instanceof CompItem){gc=imp;}";
    js += "if(!gc||gc.numLayers<1){try{if(imp instanceof FolderItem)imp.remove();}catch(e){} continue;}";
    js += "gc.layer(1).copyToComp(comp);";
    js += "var newLyr=comp.layer(1);newLyr.name=gd.name+' (grad)';";
    js += "var root=newLyr.property('ADBE Root Vectors Group'),grp=null;";
    js += "for(var j=1;j<=root.numProperties;j++){";
    js += "  if(root.property(j).matchName==='ADBE Vector Group'){grp=root.property(j).property('ADBE Vectors Group');break;}";
    js += "}";
    js += "if(!grp){try{newLyr.remove();}catch(e){} try{gc.remove();}catch(e){} continue;}";
    js += "var toRm=[];";
    js += "for(var k=1;k<=grp.numProperties;k++){var pm=grp.property(k);";
    js += "  if(pm.matchName!=='ADBE Vector Graphic - G-Fill'&&pm.matchName!=='ADBE Vector Transform Group')toRm.push(pm);}";
    js += "for(var ri=0;ri<toRm.length;ri++){try{toRm[ri].remove();}catch(er){}}";

    // Injetar shape path (usa sv_cached se disponivel)
    js += "var shapeVal=sv_cached?bC.property(bk-1).property('ADBE Vector Shape').value:null;";
    js += "if(!shapeVal&&origLyr){try{";
    js += "  var or2=origLyr.property('ADBE Root Vectors Group');";
    js += "  for(var j=1;j<=or2.numProperties;j++){";
    js += "    if(or2.property(j).matchName!=='ADBE Vector Group')continue;";
    js += "    var oc=or2.property(j).property('ADBE Vectors Group');";
    js += "    for(var k=1;k<=oc.numProperties;k++){";
    js += "      if(oc.property(k).matchName==='ADBE Vector Shape - Group'){";
    js += "        shapeVal=oc.property(k).property('ADBE Vector Shape').value;break;}";
    js += "    }if(shapeVal)break;";
    js += "  }";
    js += "}catch(er){}}";
    js += "var successGrad=false;";
    js += "if(shapeVal&&shapeVal.vertices&&shapeVal.vertices.length>=2){try{";
    js += "  var newP=grp.addProperty('ADBE Vector Shape - Group');";
    js += "  newP.property('ADBE Vector Shape').setValue(shapeVal);";
    js += "  newP.moveTo(1);successGrad=true;";
    js += "}catch(eInj){}}";

    js += "if(successGrad){";
    js += "  var gfill=null;";
    js += "  for(var k=1;k<=grp.numProperties;k++){if(grp.property(k).matchName==='ADBE Vector Graphic - G-Fill'){gfill=grp.property(k);break;}}";
    js += "  if(gfill&&gradStart&&gradEnd){";
    js += "    try{gfill.property('ADBE Vector Grad Start').setValue(gradStart);}catch(e){try{gfill.property('Ponto inicial').setValue(gradStart);}catch(e2){}}";
    js += "    try{gfill.property('ADBE Vector Grad End').setValue(gradEnd);}catch(e){try{gfill.property('Ponto final').setValue(gradEnd);}catch(e2){}}";
    js += "  }";
    js += "  try{var otr=origLyr?origLyr.property('ADBE Transform Group'):null;";
    js += "    if(otr){";
    js += "      newLyr.property('ADBE Transform Group').property('ADBE Anchor Point').setValue(otr.property('ADBE Anchor Point').value);";
    js += "      newLyr.property('ADBE Transform Group').property('ADBE Position').setValue(otr.property('ADBE Position').value);";
    js += "    }}catch(etr){}";
    js += "  try{var rv2=newLyr.property('ADBE Root Vectors Group');";
    js += "    for(var rv=1;rv<=rv2.numProperties;rv++){";
    js += "      if(rv2.property(rv).matchName==='ADBE Vector Group'){";
    js += "        var vgt=rv2.property(rv).property('ADBE Vector Transform Group');";
    js += "        if(vgt){try{vgt.property('ADBE Vector Anchor').setValue([0,0]);}catch(ea){}";
    js += "          try{vgt.property('ADBE Vector Position').setValue([0,0]);}catch(ep){}";
    js += "          try{vgt.property('ADBE Vector Scale').setValue([100,100]);}catch(es){}";
    js += "          try{vgt.property('ADBE Vector Rotation').setValue(0);}catch(er){}}break;}";
    js += "    }}catch(evgt){}";
    js += "  try{origLyr.remove();}catch(e){}";
    js += "  applied++;methodLog+='['+gd.name+':'+posMethod+'] ';";
    js += "}else{try{newLyr.remove();}catch(e){}}";
    js += "try{gc.remove();}catch(e){} try{if(imp instanceof FolderItem)imp.remove();}catch(e){}";
    js += "}"; // fim for

    js += "try{if(tempComp)tempComp.remove();}catch(e){}";
    js += "try{if(tempImpItem instanceof FolderItem)tempImpItem.remove();}catch(e){}";
    js += "comp.openInViewer();";
    js += "alert('GRAD FIXER v9\\n'+applied+' gradientes\\n'+methodLog);";
    js += "}catch(e){alert('ERRO: '+e.message+' (L'+e.line+')');}})();";

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
