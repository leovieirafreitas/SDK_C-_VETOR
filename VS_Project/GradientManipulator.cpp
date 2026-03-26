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
static SPBasicSuite* sP = NULL;
static AEGP_Command  S_cmd = 0L;

struct ColorStop { float pos, r, g, b; };
struct GradShape {
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
        if (l != std::string::npos && l > d) s = s.substr(0, l + 1);
        else if (l == d) s = s.substr(0, d);
    }
    return s;
}

static std::string GenerateGCky(const std::vector<ColorStop>& stops, int originalSize) {
    const std::string nl = "&#xA;", lt = "&lt;", gt = "&gt;", ap = "'";
    int n = originalSize > 0 ? originalSize : (int)stops.size();
    if (n < 2) n = 2; // minimum 2 stops

    std::string x;
    x += lt + "?xml version=" + ap + "1.0" + ap + "?" + gt + nl;
    x += lt + "prop.map version=" + ap + "4" + ap + gt + nl;
    x += lt + "prop.list" + gt + nl + lt + "prop.pair" + gt + nl;
    x += lt + "key" + gt + "Gradient Color Data" + lt + "/key" + gt + nl;
    x += lt + "prop.list" + gt + nl;
    x += lt + "prop.pair" + gt + nl + lt + "key" + gt + "Alpha Stops" + lt + "/key" + gt + nl;
    x += lt + "prop.list" + gt + nl + lt + "prop.pair" + gt + nl + lt + "key" + gt + "Stops List" + lt + "/key" + gt + nl;
    x += lt + "prop.list" + gt + nl;
    for (int i = 0;i < n;i++) {
        float p = 1.0f;
        if (i < (int)stops.size()) p = stops[i].pos;
        else if (!stops.empty()) p = 1.0f; // pad final positions

        x += lt + "prop.pair" + gt + nl + lt + "key" + gt + "Stop-" + std::to_string(i) + lt + "/key" + gt + nl;
        x += lt + "prop.list" + gt + nl + lt + "prop.pair" + gt + nl + lt + "key" + gt + "Stops Alpha" + lt + "/key" + gt + nl;
        x += lt + "array" + gt + nl + lt + "array.type" + gt + lt + "float/" + gt + lt + "/array.type" + gt + nl;
        x += lt + "float" + gt + F(p) + lt + "/float" + gt + nl;
        x += lt + "float" + gt + "0.5" + lt + "/float" + gt + nl;
        x += lt + "float" + gt + "1" + lt + "/float" + gt + nl;
        x += lt + "/array" + gt + nl + lt + "/prop.pair" + gt + nl + lt + "/prop.list" + gt + nl + lt + "/prop.pair" + gt + nl;
    }
    x += lt + "/prop.list" + gt + nl + lt + "/prop.pair" + gt + nl;
    x += lt + "prop.pair" + gt + nl + lt + "key" + gt + "Stops Size" + lt + "/key" + gt + nl;
    x += lt + "int type=" + ap + "unsigned" + ap + " size=" + ap + "32" + ap + gt + std::to_string(n) + lt + "/int" + gt + nl;
    x += lt + "/prop.pair" + gt + nl + lt + "/prop.list" + gt + nl + lt + "/prop.pair" + gt + nl;

    x += lt + "prop.pair" + gt + nl + lt + "key" + gt + "Color Stops" + lt + "/key" + gt + nl;
    x += lt + "prop.list" + gt + nl + lt + "prop.pair" + gt + nl + lt + "key" + gt + "Stops List" + lt + "/key" + gt + nl;
    x += lt + "prop.list" + gt + nl;
    for (int i = 0;i < n;i++) {
        float pos = 1.0f, r = 0.0f, g = 0.0f, b = 0.0f;
        if (i < (int)stops.size()) {
            pos = stops[i].pos; r = stops[i].r; g = stops[i].g; b = stops[i].b;
        }
        else if (!stops.empty()) {
            pos = 1.0f; r = stops.back().r; g = stops.back().g; b = stops.back().b;
        }

        x += lt + "prop.pair" + gt + nl + lt + "key" + gt + "Stop-" + std::to_string(i) + lt + "/key" + gt + nl;
        x += lt + "prop.list" + gt + nl + lt + "prop.pair" + gt + nl + lt + "key" + gt + "Stops Color" + lt + "/key" + gt + nl;
        x += lt + "array" + gt + nl + lt + "array.type" + gt + lt + "float/" + gt + lt + "/array.type" + gt + nl;
        x += lt + "float" + gt + F(pos) + lt + "/float" + gt + nl;
        x += lt + "float" + gt + "0.5" + lt + "/float" + gt + nl;
        x += lt + "float" + gt + F(r) + lt + "/float" + gt + nl;
        x += lt + "float" + gt + F(g) + lt + "/float" + gt + nl;
        x += lt + "float" + gt + F(b) + lt + "/float" + gt + nl;
        x += lt + "float" + gt + "1" + lt + "/float" + gt + nl;
        x += lt + "/array" + gt + nl + lt + "/prop.pair" + gt + nl + lt + "/prop.list" + gt + nl + lt + "/prop.pair" + gt + nl;
    }
    x += lt + "/prop.list" + gt + nl + lt + "/prop.pair" + gt + nl;
    x += lt + "prop.pair" + gt + nl + lt + "key" + gt + "Stops Size" + lt + "/key" + gt + nl;
    x += lt + "int type=" + ap + "unsigned" + ap + " size=" + ap + "32" + ap + gt + std::to_string(n) + lt + "/int" + gt + nl;
    x += lt + "/prop.pair" + gt + nl + lt + "/prop.list" + gt + nl + lt + "/prop.pair" + gt + nl;

    x += lt + "prop.pair" + gt + nl + lt + "key" + gt + "Gradient Colors" + lt + "/key" + gt + nl;
    x += lt + "string" + gt + "1.0" + lt + "/string" + gt + nl;
    x += lt + "/prop.pair" + gt + nl + lt + "/prop.list" + gt + nl + lt + "/prop.pair" + gt + nl;
    x += lt + "/prop.list" + gt + nl + lt + "/prop.map" + gt + nl;
    return x;
}

static bool WriteBatchAEPX(const std::vector<GradShape>& shapes, const std::string& outPath) {
    std::ifstream tp("C:\\AEGP\\grad_batch_template.aepx", std::ios::binary);
    if (!tp.is_open()) return false;
    std::ostringstream ss; ss << tp.rdbuf(); tp.close();
    std::string aepx = ss.str();

    size_t searchPos = 0;
    for (size_t i = 0; i < shapes.size(); i++) {
        size_t gkyStart = aepx.find("<GCky>", searchPos);
        if (gkyStart == std::string::npos) break;
        size_t gkyEnd = aepx.find("</GCky>", gkyStart);
        if (gkyEnd != std::string::npos) {
            size_t innerStart = gkyStart + 6;
            size_t innerLength = gkyEnd - innerStart;

            int originalSize = 2;
            size_t sizeIndex = aepx.find("Stops Size", innerStart);
            if (sizeIndex != std::string::npos && sizeIndex < gkyEnd) {
                size_t intPos = aepx.find("&lt;int ", sizeIndex);
                if (intPos != std::string::npos && intPos < gkyEnd) {
                    size_t gtPos = aepx.find("&gt;", intPos);
                    if (gtPos != std::string::npos && gtPos < gkyEnd) {
                        try { originalSize = std::stoi(aepx.substr(gtPos + 4, 10)); }
                        catch (...) {}
                    }
                }
            }

            std::string gky = GenerateGCky(shapes[i].stops, originalSize);
            std::string injection = "\n<string>" + gky + "</string>\n";
            aepx.replace(innerStart, innerLength, injection);
            searchPos = innerStart + injection.length() + 7;
        }
        else {
            break;
        }
    }

    std::ofstream out(outPath, std::ios::binary);
    if (!out.is_open()) return false;
    out << aepx; out.close(); return true;
}

static bool ParseGradJSON(const std::string& js, std::vector<GradShape>& shapes) {
    size_t p = 0;
    while (true) {
        size_t sn = js.find("\"name\"", p); if (sn == std::string::npos) break;
        size_t q1 = js.find('"', sn + 7) + 1, q2 = js.find('"', q1);
        std::string shapeName = js.substr(q1, q2 - q1);
        size_t nextName = js.find("\"name\"", q2 + 1);
        size_t scopeEnd = (nextName != std::string::npos) ? nextName : js.size();
        size_t ftPos = js.find("\"fillType\"", sn);
        if (ftPos != std::string::npos && ftPos < scopeEnd) {
            size_t fvS = js.find('"', js.find(':', ftPos) + 1) + 1, fvE = js.find('"', fvS);
            if (js.substr(fvS, fvE - fvS) != "gradient") { p = scopeEnd; continue; }
        }
        size_t gn = js.find("\"gradient\"", sn);
        if (gn == std::string::npos || gn >= scopeEnd) { p = scopeEnd; continue; }
        GradShape gs; gs.name = shapeName;
        auto num = [&](const std::string& key, size_t from) -> float {
            size_t kp = js.find(key, from); if (kp == std::string::npos || kp >= scopeEnd) return 0.f;
            size_t cp = js.find(':', kp) + 1;
            while (cp < js.size() && (js[cp] == ' ' || js[cp] == '\n' || js[cp] == '\r')) cp++;
            try { return (float)std::stod(js.substr(cp, 30)); }
            catch (...) { return 0.f; }
            };
        gs.angle = num("\"angle\"", gn);
        gs.gsX = num("\"startX\"", gn); gs.gsY = num("\"startY\"", gn);
        gs.geX = num("\"endX\"", gn); gs.geY = num("\"endY\"", gn);
        size_t stA = js.find("\"stops\"", gn);
        if (stA != std::string::npos && stA < scopeEnd) {
            size_t brS = js.find('[', stA);
            size_t brE = js.find(']', brS);
            if (brS != std::string::npos && brE != std::string::npos && brE < scopeEnd) {
                size_t sp = brS;
                while (true) {
                    size_t ob = js.find('{', sp); if (ob == std::string::npos || ob > brE) break;
                    size_t cb = js.find('}', ob); if (cb == std::string::npos) break;
                    auto cnum = [&](const std::string& k) {
                        size_t kp = js.find(k, ob); if (kp == std::string::npos || kp > cb) return 0.f;
                        size_t colon = js.find(':', kp) + 1;
                        while (colon < cb && (js[colon] == ' ' || js[colon] == '\n' || js[colon] == '\r')) colon++;
                        try { return (float)std::stod(js.substr(colon, 15)); }
                        catch (...) { return 0.f; }
                        };
                    ColorStop cs; cs.pos = cnum("\"pos\"");
                    cs.r = cnum("\"r\""); cs.g = cnum("\"g\""); cs.b = cnum("\"b\"");
                    gs.stops.push_back(cs); sp = cb + 1;
                }
            }
        }
        shapes.push_back(gs); p = scopeEnd;
    }
    return true;
}

static void ParseAiPath(const std::string& js, std::string& aiPath) {
    aiPath = "";
    size_t ap = js.find("\"aiPath\""); if (ap == std::string::npos) return;
    size_t q1 = js.find('"', ap + 9); if (q1 == std::string::npos) return; q1++;
    size_t q2 = js.find('"', q1);   if (q2 == std::string::npos) return;
    aiPath = js.substr(q1, q2 - q1);
    for (char& c : aiPath) if (c == '\\') c = '/';
}

static std::string EscJS(const std::string& s) {
    std::string r;
    for (char c : s) {
        if (c == '\\') r += "\\\\";
        else if (c == '\'') r += "\\'";
        else if (c == '\n') r += "\\n";
        else if (c == '\r') r += "\\r";
        else r += c;
    }
    return r;
}

static A_Err ApplyGradientsToExistingLayers(AEGP_SuiteHandler& suites) {
    std::ifstream jf("C:\\AEGP\\grad_data.json");
    if (!jf.is_open()) {
        suites.UtilitySuite3()->AEGP_ReportInfo(S_my_id, "ERRO: C:\\AEGP\\grad_data.json ausente.");
        return A_Err_NONE;
    }
    std::ostringstream jsonss; jsonss << jf.rdbuf(); jf.close();
    std::string jsonStr = jsonss.str();

    std::vector<GradShape> shapes;
    if (!ParseGradJSON(jsonStr, shapes)) return A_Err_NONE;
    std::string aiPath; ParseAiPath(jsonStr, aiPath);

    std::string batchPath = "C:\\AEGP\\ae_batch_temp.aepx";
    if (!WriteBatchAEPX(shapes, batchPath)) {
        suites.UtilitySuite3()->AEGP_ReportInfo(S_my_id, "ERRO MESTRE: C:\\AEGP\\grad_batch_template.aepx ausente (Template Lote).");
        return A_Err_GENERIC;
    }

    std::string gradJS = "[";
    for (int si = 0; si < (int)shapes.size(); si++) {
        if (si > 0) gradJS += ",";
        gradJS += "{name:'" + EscJS(shapes[si].name) + "'";
        gradJS += ",angle:" + F(shapes[si].angle);
        gradJS += ",gsX:" + F(shapes[si].gsX) + ",gsY:" + F(shapes[si].gsY);
        gradJS += ",geX:" + F(shapes[si].geX) + ",geY:" + F(shapes[si].geY);
        gradJS += "}";
    }
    gradJS += "]";

    std::string js;
    js += "(function(){try{\n";
    js += "app.beginUndoGroup('Injetar Lote de Gradientes');\n";
    js += "var grads=" + gradJS + ";\nvar comp=app.project.activeItem;\n";
    js += "if(!comp||!(comp instanceof CompItem)){alert('Abra uma comp!');return;}\n";

    js += "var batchFile=new File('C:/AEGP/ae_batch_temp.aepx');\n";
    js += "if(!batchFile.exists){alert('Template em lote n gerado!');return;}\n";
    js += "var bImp=app.project.importFile(new ImportOptions(batchFile));\n";
    js += "var bComp=null; if(bImp instanceof FolderItem){for(var i=1;i<=bImp.numItems;i++){if(bImp.item(i) instanceof CompItem){bComp=bImp.item(i);break;}}} else if(bImp instanceof CompItem){bComp=bImp;}\n";
    js += "if(!bComp){alert('Batch Comp invalida!');return;}\n";

    js += "var applied=0;\n";
    js += "for(var gi=0;gi<grads.length;gi++){\n";
    js += "  var gd=grads[gi];\n";
    js += "  var origLyr=null;\n";
    js += "  for(var li=1;li<=comp.numLayers;li++){if(comp.layer(li).name===gd.name){origLyr=comp.layer(li);break;}}\n";
    js += "  if(!origLyr)continue;\n";
    js += "  var shapeVal=null;\n";
    js += "  try{ \n";
    js += "    var origRoot=origLyr.property('ADBE Root Vectors Group');\n";
    js += "    for(var j=1;j<=origRoot.numProperties;j++){\n";
    js += "      var origGrp=origRoot.property(j); if(origGrp.matchName!=='ADBE Vector Group')continue;\n";
    js += "      var origCont=origGrp.property('ADBE Vectors Group');\n";
    js += "      for(var k=1;k<=origCont.numProperties;k++){\n";
    js += "        var origP=origCont.property(k);\n";
    js += "        if(origP.matchName==='ADBE Vector Shape - Group'){shapeVal=origP.property('ADBE Vector Shape').value;break;}\n";
    js += "      } if(shapeVal)break;\n";
    js += "    } \n";
    js += "  }catch(er){}\n";
    js += "  if(!shapeVal||shapeVal.vertices.length<2)continue;\n";

    js += "  if((gi+1)>bComp.numLayers)continue;\n";
    js += "  bComp.layer(gi+1).copyToComp(comp); var newLyr=comp.layer(1); newLyr.name=gd.name+' (grad)';\n";
    js += "  var root=newLyr.property('ADBE Root Vectors Group'),grp=null;\n";
    js += "  for(var j=1;j<=root.numProperties;j++){var pg=root.property(j); if(pg.matchName==='ADBE Vector Group'){grp=pg.property('ADBE Vectors Group');break;}}\n";
    js += "  if(!grp)continue;\n";
    js += "  var toRemove=[];\n";
    js += "  for(var k=1;k<=grp.numProperties;k++){var pm=grp.property(k); if(pm.matchName!=='ADBE Vector Graphic - G-Fill' && pm.matchName!=='ADBE Vector Transform Group'){toRemove.push(pm);}}\n";
    js += "  for(var ri=0;ri<toRemove.length;ri++){try{toRemove[ri].remove();}catch(er){}}\n";

    js += "  try{ \n";
    js += "    var newP=grp.addProperty('ADBE Vector Shape - Group'); newP.property('ADBE Vector Shape').setValue(shapeVal); newP.moveTo(1);\n";
    js += "    var gfill=null; for(var g=1;g<=grp.numProperties;g++){if(grp.property(g).matchName==='ADBE Vector Graphic - G-Fill'){gfill=grp.property(g);break;}}\n";
    js += "    if(gfill){\n";
    js += "      try{gfill.property('Ponto inicial').setValue([gd.gsX,gd.gsY]);}catch(e){try{gfill.property('ADBE Vector Grad Start').setValue([gd.gsX,gd.gsY]);}catch(e2){}}\n";
    js += "      try{gfill.property('Ponto final').setValue([gd.geX,gd.geY]);}catch(e){try{gfill.property('ADBE Vector Grad End').setValue([gd.geX,gd.geY]);}catch(e2){}}\n";
    js += "    }\n";
    js += "  }catch(eInj){}\n";

    js += "  var origTr=origLyr.property('ADBE Transform Group');\n";
    js += "  var origPos=origTr.property('ADBE Position').value;\n";
    js += "  var origAnch=origTr.property('ADBE Anchor Point').value;\n";
    js += "  var origOpac=origTr.property('ADBE Opacity').value;\n";
    js += "  var newTr=newLyr.property('ADBE Transform Group');\n";
    js += "  try{if(origLyr.parent) newLyr.parent=origLyr.parent;}catch(ep){}\n";
    js += "  newTr.property('ADBE Anchor Point').setValue(origAnch);\n";
    js += "  newTr.property('ADBE Position').setValue(origPos);\n";
    js += "  try{newTr.property('ADBE Opacity').setValue(origOpac);}catch(eop){}\n";
    js += "  try{\n";
    js += "    var rootVec2=newLyr.property('ADBE Root Vectors Group');\n";
    js += "    for(var rv=1;rv<=rootVec2.numProperties;rv++){\n";
    js += "      var rvp=rootVec2.property(rv); if(rvp.matchName==='ADBE Vector Group'){\n";
    js += "        var vgt2=rvp.property('ADBE Vector Transform Group');\n";
    js += "        if(vgt2){\n";
    js += "          try{vgt2.property('ADBE Vector Anchor').setValue([0,0]);}catch(ea){}\n";
    js += "          try{vgt2.property('ADBE Vector Position').setValue([0,0]);}catch(ep){}\n";
    js += "          try{vgt2.property('ADBE Vector Scale').setValue([100,100]);}catch(es){}\n";
    js += "          try{vgt2.property('ADBE Vector Rotation').setValue(0);}catch(er){}\n";
    js += "        }\n";
    js += "      }\n";
    js += "    }\n";
    js += "  }catch(evgt){}\n";
    js += "  try{newLyr.moveBefore(origLyr);}catch(em){}\n";
    js += "  try{origLyr.remove();}catch(e){}\n";
    js += "  applied++;\n";
    js += "}\n";

    js += "try{bImp.remove();}catch(e){}\n";
    js += "app.endUndoGroup();\n";
    js += "comp.openInViewer();\n";
    js += "}catch(e){alert('ERRO: '+e.message+' (L'+e.line+')');}})();\n";

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