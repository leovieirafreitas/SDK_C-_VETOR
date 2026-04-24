#define _CRT_SECURE_NO_WARNINGS
#include "AEConfig.h"
#ifdef AE_OS_WIN
#include <windows.h>
#endif
#include "AEGP_SuiteHandler.h"
#include "AE_GeneralPlug.h"
#include "AE_Macros.h"
#include <fstream>
#include <map>
#include <sstream>
#include <string>
#include <vector>

static AEGP_PluginID S_my_id = 0L;
static SPBasicSuite *sP = NULL;
static AEGP_Command S_cmd = 0L;

struct ColorStop {
  float pos, r, g, b, a;
};
struct RGBColor {
  float r, g, b;
};
struct GradShape {
  std::string name;
  std::string parent;
  std::string type;
  RGBColor color;
  float angle = 0.f, gsX = 0.f, gsY = 0.f, geX = 0.f, geY = 0.f;
  float x = 0.f, y = 0.f; // shape centre in comp space
  float opacity = 1.0f;   // layer opacity 0..1
  std::vector<ColorStop> stops;
};

static void ReplaceAll(std::string &s, const std::string &f,
                       const std::string &t) {
  if (f.empty())
    return;
  size_t p = 0;
  while ((p = s.find(f, p)) != std::string::npos) {
    s.replace(p, f.length(), t);
    p += t.length();
  }
}
static std::string F(float v) {
  if (v == 0.0f)
    return "0";
  if (v == 1.0f)
    return "1";
  char b[32];
  sprintf_s(b, "%.6f", v);
  std::string s(b);
  size_t d = s.find('.');
  if (d != std::string::npos) {
    size_t l = s.find_last_not_of('0');
    if (l != std::string::npos && l > d)
      s = s.substr(0, l + 1);
    else if (l == d)
      s = s.substr(0, d);
  }
  return s;
}

static std::string GenerateGCky(const std::vector<ColorStop> &stops,
                                int originalSize) {
  const std::string nl = "&#xA;", lt = "&lt;", gt = "&gt;", ap = "'";
  int n = originalSize > 0 ? originalSize
                           : (stops.size() > 0 ? (int)stops.size() : 2);
  if (n < 2)
    n = 2; // minimum 2 stops

  std::string x;
  x += lt + "?xml version=" + ap + "1.0" + ap + "?" + gt + nl;
  x += lt + "prop.map version=" + ap + "4" + ap + gt + nl;
  x += lt + "prop.list" + gt + nl + lt + "prop.pair" + gt + nl;
  x += lt + "key" + gt + "Gradient Color Data" + lt + "/key" + gt + nl;
  x += lt + "prop.list" + gt + nl;
  x += lt + "prop.pair" + gt + nl + lt + "key" + gt + "Alpha Stops" + lt +
       "/key" + gt + nl;
  x += lt + "prop.list" + gt + nl + lt + "prop.pair" + gt + nl + lt + "key" +
       gt + "Stops List" + lt + "/key" + gt + nl;
  x += lt + "prop.list" + gt + nl;
  for (int i = 0; i < n; i++) {
    float p = 1.0f, a = 1.0f;
    if (i < (int)stops.size()) {
      p = stops[i].pos;
      a = stops[i].a;
    } else if (!stops.empty()) {
      p = 1.0f;
      a = stops.back().a;
    } else {
      p = (float)i / (n > 1 ? (float)(n - 1) : 1.0f);
      a = 1.0f;
    }

    x += lt + "prop.pair" + gt + nl + lt + "key" + gt + "Stop-" +
         std::to_string(i) + lt + "/key" + gt + nl;
    x += lt + "prop.list" + gt + nl + lt + "prop.pair" + gt + nl + lt + "key" +
         gt + "Stops Alpha" + lt + "/key" + gt + nl;
    x += lt + "array" + gt + nl + lt + "array.type" + gt + lt + "float/" + gt +
         lt + "/array.type" + gt + nl;
    x += lt + "float" + gt + F(p) + lt + "/float" + gt + nl;
    x += lt + "float" + gt + "0.5" + lt + "/float" + gt + nl;
    x += lt + "float" + gt + F(a) + lt + "/float" + gt + nl;
    x += lt + "/array" + gt + nl + lt + "/prop.pair" + gt + nl + lt +
         "/prop.list" + gt + nl + lt + "/prop.pair" + gt + nl;
  }
  x += lt + "/prop.list" + gt + nl + lt + "/prop.pair" + gt + nl;
  x += lt + "prop.pair" + gt + nl + lt + "key" + gt + "Stops Size" + lt +
       "/key" + gt + nl;
  x += lt + "int type=" + ap + "unsigned" + ap + " size=" + ap + "32" + ap +
       gt + std::to_string(n) + lt + "/int" + gt + nl;
  x += lt + "/prop.pair" + gt + nl + lt + "/prop.list" + gt + nl + lt +
       "/prop.pair" + gt + nl;

  x += lt + "prop.pair" + gt + nl + lt + "key" + gt + "Color Stops" + lt +
       "/key" + gt + nl;
  x += lt + "prop.list" + gt + nl + lt + "prop.pair" + gt + nl + lt + "key" +
       gt + "Stops List" + lt + "/key" + gt + nl;
  x += lt + "prop.list" + gt + nl;
  for (int i = 0; i < n; i++) {
    float pos = 1.0f, r = 0.0f, g = 0.0f, b = 0.0f;
    if (i < (int)stops.size()) {
      pos = stops[i].pos;
      r = stops[i].r;
      g = stops[i].g;
      b = stops[i].b;
    } else if (!stops.empty()) {
      pos = 1.0f;
      r = stops.back().r;
      g = stops.back().g;
      b = stops.back().b;
    } else {
      pos = (float)i / (n > 1 ? (float)(n - 1) : 1.0f);
      r = g = b = pos;
    }

    x += lt + "prop.pair" + gt + nl + lt + "key" + gt + "Stop-" +
         std::to_string(i) + lt + "/key" + gt + nl;
    x += lt + "prop.list" + gt + nl + lt + "prop.pair" + gt + nl + lt + "key" +
         gt + "Stops Color" + lt + "/key" + gt + nl;
    x += lt + "array" + gt + nl + lt + "array.type" + gt + lt + "float/" + gt +
         lt + "/array.type" + gt + nl;
    x += lt + "float" + gt + F(pos) + lt + "/float" + gt + nl;
    x += lt + "float" + gt + "0.5" + lt + "/float" + gt + nl;
    x += lt + "float" + gt + F(r) + lt + "/float" + gt + nl;
    x += lt + "float" + gt + F(g) + lt + "/float" + gt + nl;
    x += lt + "float" + gt + F(b) + lt + "/float" + gt + nl;
    x += lt + "float" + gt + "1" + lt + "/float" + gt + nl;
    x += lt + "/array" + gt + nl + lt + "/prop.pair" + gt + nl + lt +
         "/prop.list" + gt + nl + lt + "/prop.pair" + gt + nl;
  }
  x += lt + "/prop.list" + gt + nl + lt + "/prop.pair" + gt + nl;
  x += lt + "prop.pair" + gt + nl + lt + "key" + gt + "Stops Size" + lt +
       "/key" + gt + nl;
  x += lt + "int type=" + ap + "unsigned" + ap + " size=" + ap + "32" + ap +
       gt + std::to_string(n) + lt + "/int" + gt + nl;
  x += lt + "/prop.pair" + gt + nl + lt + "/prop.list" + gt + nl + lt +
       "/prop.pair" + gt + nl;

  x += lt + "prop.pair" + gt + nl + lt + "key" + gt + "Gradient Colors" + lt +
       "/key" + gt + nl;
  x += lt + "string" + gt + "1.0" + lt + "/string" + gt + nl;
  x += lt + "/prop.pair" + gt + nl + lt + "/prop.list" + gt + nl + lt +
       "/prop.pair" + gt + nl;
  x += lt + "/prop.list" + gt + nl + lt + "/prop.map" + gt + nl;
  return x;
}
static bool WriteBatchAEPX(const std::vector<GradShape> &shapes,
                           const std::string &outPath,
                           const std::string &templatePath) {
  std::ifstream tp(templatePath, std::ios::binary);
  if (!tp.is_open())
    return false;
  std::ostringstream ss;
  ss << tp.rdbuf();
  tp.close();
  std::string aepx = ss.str();

  size_t searchPos = 0;
  for (size_t i = 0; i < shapes.size(); i++) {
    if (shapes[i].type != "gradient")
      continue;
    size_t gkyStart = aepx.find("<GCky>", searchPos);
    if (gkyStart == std::string::npos)
      break;
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
            try {
              originalSize = std::stoi(aepx.substr(gtPos + 4, 10));
            } catch (...) {
            }
          }
        }
      }

      std::string gky = GenerateGCky(shapes[i].stops, originalSize);
      std::string injection = "\n<string>" + gky + "</string>\n";
      aepx.replace(innerStart, innerLength, injection);
      searchPos = innerStart + injection.length() + 7;
    } else {
      break;
    }
  }

  std::ofstream out(outPath, std::ios::binary);
  if (!out.is_open())
    return false;
  out << aepx;
  out.close();
  return true;
}

// Same as WriteBatchAEPX but uses grad_group_template.aepx (1 layer, N groups)
static bool WriteGroupAEPX(const std::vector<GradShape> &shapes,
                           const std::string &outPath,
                           const std::string &templatePath) {
  std::ifstream tp(templatePath, std::ios::binary);
  if (!tp.is_open())
    return false;
  std::ostringstream ss;
  ss << tp.rdbuf();
  tp.close();
  std::string aepx = ss.str();
  size_t searchPos = 0;
  for (size_t i = 0; i < shapes.size(); i++) {
    if (shapes[i].type != "gradient")
      continue;
    size_t gkyStart = aepx.find("<GCky>", searchPos);
    if (gkyStart == std::string::npos)
      break;
    size_t gkyEnd = aepx.find("</GCky>", gkyStart);
    if (gkyEnd == std::string::npos)
      break;
    size_t innerStart = gkyStart + 6;
    size_t innerLength = gkyEnd - innerStart;
    int originalSize = 2;
    size_t sizeIndex = aepx.find("Stops Size", innerStart);
    if (sizeIndex != std::string::npos && sizeIndex < gkyEnd) {
      size_t intPos = aepx.find("&lt;int ", sizeIndex);
      if (intPos != std::string::npos && intPos < gkyEnd) {
        size_t gtPos = aepx.find("&gt;", intPos);
        if (gtPos != std::string::npos && gtPos < gkyEnd) {
          try {
            originalSize = std::stoi(aepx.substr(gtPos + 4, 10));
          } catch (...) {
          }
        }
      }
    }
    std::string gky = GenerateGCky(shapes[i].stops, originalSize);
    std::string injection = "\n<string>" + gky + "</string>\n";
    aepx.replace(innerStart, innerLength, injection);
    searchPos = innerStart + injection.length() + 7;
  }
  std::ofstream out(outPath, std::ios::binary);
  if (!out.is_open())
    return false;
  out << aepx;
  out.close();
  return true;
}

static bool WriteVetoresAEPX(const std::vector<GradShape> &shapes,
                             const std::string &outPath,
                             const std::string &templatePath) {
  std::ifstream tp(templatePath, std::ios::binary);
  if (!tp.is_open())
    return false;
  std::ostringstream ss;
  ss << tp.rdbuf();
  tp.close();
  std::string aepx = ss.str();

  size_t searchPos = 0;
  for (size_t i = 0; i < shapes.size(); i++) {
    if (shapes[i].type != "gradient")
      continue;
    size_t gkyStart = aepx.find("<GCky>", searchPos);
    if (gkyStart == std::string::npos)
      break;
    size_t gkyEnd = aepx.find("</GCky>", gkyStart);
    if (gkyEnd == std::string::npos)
      break;

    size_t innerStart = gkyStart + 6;
    size_t innerLength = gkyEnd - innerStart;

    int originalSize = 2;
    size_t sizeIndex = aepx.find("Stops Size", innerStart);
    if (sizeIndex != std::string::npos && sizeIndex < gkyEnd) {
      size_t intPos = aepx.find("&lt;int ", sizeIndex);
      if (intPos != std::string::npos && intPos < gkyEnd) {
        size_t gtPos = aepx.find("&gt;", intPos);
        if (gtPos != std::string::npos && gtPos < gkyEnd) {
          try {
            originalSize = std::stoi(aepx.substr(gtPos + 4, 10));
          } catch (...) {
          }
        }
      }
    }

    std::string gky = GenerateGCky(shapes[i].stops, originalSize);
    std::string injection = "\n<string>" + gky + "</string>\n";
    aepx.replace(innerStart, innerLength, injection);
    searchPos = innerStart + injection.length() + 7;
  }

  std::ofstream outf(outPath, std::ios::binary);
  if (!outf.is_open())
    return false;
  outf << aepx;
  outf.close();
  return true;
}

static bool ParseGradJSON(const std::string &js, std::vector<GradShape> &shapes,
                          std::map<std::string, std::string> &nameMap) {
  std::map<std::string, std::string> groupNameToOrig;
  {
    size_t pp = 0;
    while (true) {
      size_t sn2 = js.find("\"name\"", pp);
      if (sn2 == std::string::npos)
        break;
      size_t q1 = js.find('"', sn2 + 7) + 1, q2 = js.find('"', q1);
      if (q1 == std::string::npos || q2 == std::string::npos)
        break;
      std::string gName = js.substr(q1, q2 - q1);
      size_t nextN = js.find("\"name\"", q2 + 1);
      size_t scope2 = (nextN != std::string::npos) ? nextN : js.size();
      size_t ft2 = js.find("\"fillType\"", sn2);
      if (ft2 != std::string::npos && ft2 < scope2) {
        size_t fS = js.find('"', js.find(':', ft2) + 1) + 1,
               fE = js.find('"', fS);
        if (js.substr(fS, fE - fS) == "group") {
          size_t on = js.find("\"origName\"", sn2);
          std::string orig = gName;
          if (on != std::string::npos && on < scope2) {
            size_t oq1 = js.find('"', js.find(':', on) + 1) + 1;
            size_t oq2 = js.find('"', oq1);
            if (oq1 != std::string::npos && oq2 != std::string::npos) {
              std::string parsed = js.substr(oq1, oq2 - oq1);
              if (!parsed.empty())
                orig = parsed;
            }
          }
          groupNameToOrig[gName] = orig;
        }
      }
      pp = q2 + 1;
    }
  }

  size_t p = 0;
  while (true) {
    size_t sn = js.find("\"name\"", p);
    if (sn == std::string::npos)
      break;
    size_t q1 = js.find('"', sn + 7) + 1, q2 = js.find('"', q1);
    std::string shapeName = js.substr(q1, q2 - q1);
    size_t nextName = js.find("\"name\"", q2 + 1);
    size_t scopeEnd = (nextName != std::string::npos) ? nextName : js.size();
    size_t ftPos = js.find("\"fillType\"", sn);
    std::string fType = "gradient";
    if (ftPos != std::string::npos && ftPos < scopeEnd) {
      size_t fvS = js.find('"', js.find(':', ftPos) + 1) + 1,
             fvE = js.find('"', fvS);
      fType = js.substr(fvS, fvE - fvS);
    }

    GradShape gs;
    gs.name = shapeName;
    gs.type = fType;

    auto num = [&](const std::string &key, size_t from) -> float {
      size_t kp = js.find(key, from);
      if (kp == std::string::npos || kp >= scopeEnd)
        return 0.f;
      size_t cp = js.find(':', kp) + 1;
      while (cp < js.size() &&
             (js[cp] == ' ' || js[cp] == '\n' || js[cp] == '\r'))
        cp++;
      try {
        return (float)std::stod(js.substr(cp, 30));
      } catch (...) {
        return 0.f;
      }
    };

    gs.x = num("\"x\"", sn);
    gs.y = num("\"y\"", sn);
    {
      float ov = num("\"opacity\"", sn);
      gs.opacity = (ov > 1.0f) ? ov / 100.0f : (ov <= 0.0f ? 1.0f : ov);
    }

    if (fType == "solid") {
      size_t clKey = js.find("\"color\"", sn);
      if (clKey != std::string::npos && clKey < scopeEnd) {
        size_t brS = js.find('[', clKey);
        size_t brE = js.find(']', brS);
        if (brS != std::string::npos && brE != std::string::npos) {
          std::string c_str = js.substr(brS + 1, brE - brS - 1);
          float c[3] = {0, 0, 0};
          int c_idx = 0;
          size_t p2 = 0;
          while (p2 < c_str.size() && c_idx < 3) {
            size_t nx = c_str.find(',', p2);
            if (nx == std::string::npos)
              nx = c_str.size();
            try {
              c[c_idx] = (float)std::stod(c_str.substr(p2, nx - p2));
            } catch (...) {
            }
            p2 = nx + 1;
            c_idx++;
          }
          gs.color.r = c[0];
          gs.color.g = c[1];
          gs.color.b = c[2];
        }
      }
    } else if (fType == "gradient") {
      size_t gn = js.find("\"gradient\"", sn);
      if (gn == std::string::npos || gn >= scopeEnd) {
        p = scopeEnd;
        continue;
      }
      gs.angle = num("\"angle\"", gn);
      gs.gsX = num("\"startX\"", gn);
      gs.gsY = num("\"startY\"", gn);
      gs.geX = num("\"endX\"", gn);
      gs.geY = num("\"endY\"", gn);
      gs.x = num("\"x\"", sn);
      gs.y = num("\"y\"", sn);
      size_t stA = js.find("\"stops\"", gn);
      if (stA != std::string::npos && stA < scopeEnd) {
        size_t brS = js.find('[', stA);
        size_t brE = js.find(']', brS);
        if (brS != std::string::npos && brE != std::string::npos &&
            brE < scopeEnd) {
          size_t sp = brS;
          while (true) {
            size_t ob = js.find('{', sp);
            if (ob == std::string::npos || ob > brE)
              break;
            size_t cb = js.find('}', ob);
            if (cb == std::string::npos)
              break;
            auto cnum = [&](const std::string &k) {
              size_t kp = js.find(k, ob);
              if (kp == std::string::npos || kp > cb)
                return 0.f;
              size_t colon = js.find(':', kp) + 1;
              while (colon < cb && (js[colon] == ' ' || js[colon] == '\n' ||
                                    js[colon] == '\r'))
                colon++;
              try {
                return (float)std::stod(js.substr(colon, 15));
              } catch (...) {
                return 0.f;
              }
            };
            ColorStop cs;
            cs.pos = cnum("\"pos\"");
            cs.r = cnum("\"r\"");
            cs.g = cnum("\"g\"");
            cs.b = cnum("\"b\"");
            size_t opacKp = js.find("\"opacity\"", ob);
            if (opacKp != std::string::npos && opacKp <= cb)
              cs.a = cnum("\"opacity\"");
            else
              cs.a = 1.0f;
            gs.stops.push_back(cs);
            sp = cb + 1;
          }
        }
      }
    }
    {
      size_t ppPos = js.find("\"parent\"", sn);
      if (ppPos != std::string::npos && ppPos < scopeEnd) {
        size_t pq1 = js.find(':', ppPos);
        if (pq1 != std::string::npos) {
          size_t pq2 = js.find('"', pq1 + 1);
          if (pq2 != std::string::npos) {
            pq2++;
            size_t pq3 = js.find('"', pq2);
            if (pq3 != std::string::npos) {
              gs.parent = js.substr(pq2, pq3 - pq2);
            }
          }
        }
      }
    }
    shapes.push_back(gs);
    p = scopeEnd;
  }
  nameMap = groupNameToOrig;
  return true;
}

static void ParseAiPath(const std::string &js, std::string &aiPath) {
  aiPath = "";
  size_t ap = js.find("\"aiPath\"");
  if (ap == std::string::npos)
    return;
  size_t q1 = js.find('"', ap + 9);
  if (q1 == std::string::npos)
    return;
  q1++;
  size_t q2 = js.find('"', q1);
  if (q2 == std::string::npos)
    return;
  aiPath = js.substr(q1, q2 - q1);
  for (char &c : aiPath)
    if (c == '\\')
      c = '/';
}

static std::string EscJS(const std::string &s) {
  std::string r;
  for (char c : s) {
    if (c == '\\')
      r += "\\\\";
    else if (c == '\'')
      r += "\\'";
    else if (c == '\n')
      r += "\\n";
    else if (c == '\r')
      r += "\\r";
    else
      r += c;
  }
  return r;
}

static A_Err ApplyGradientsToExistingLayers(AEGP_SuiteHandler &suites) {
  std::ifstream jf("C:\\AEGP\\grad_data.json");
  if (!jf.is_open()) {
    suites.UtilitySuite3()->AEGP_ReportInfo(
        S_my_id, "ERRO: C:\\AEGP\\grad_data.json ausente.");
    return A_Err_NONE;
  }
  std::ostringstream jsonss;
  jsonss << jf.rdbuf();
  jf.close();
  std::string jsonStr = jsonss.str();

  std::vector<GradShape> shapes;
  std::map<std::string, std::string> groupNameToOrig;
  if (!ParseGradJSON(jsonStr, shapes, groupNameToOrig))
    return A_Err_NONE;
  std::string aiPath;
  ParseAiPath(jsonStr, aiPath);

  int gradCount = 0;
  for (size_t i = 0; i < shapes.size(); i++) {
    if (shapes[i].type == "gradient")
      gradCount++;
  }

  std::string batchTpl = "C:\\AEGP\\grad_batch_template.aepx";
  std::string groupTpl = "C:\\AEGP\\nested_group_template.aepx";
  if (gradCount > 50) {
    batchTpl = "C:\\AEGP\\grad_batch_template_1000.aepx";
    groupTpl = "C:\\AEGP\\nested_group_template_1000.aepx";
  }

  std::string batchPath = "C:\\AEGP\\ae_batch_temp.aepx";
  if (!WriteBatchAEPX(shapes, batchPath, batchTpl)) {
    suites.UtilitySuite3()->AEGP_ReportInfo(
        S_my_id, ("ERRO: Nao achou " + batchTpl).c_str());
    return A_Err_GENERIC;
  }
  WriteGroupAEPX(shapes, "C:\\AEGP\\ae_group_temp.aepx", groupTpl);

  std::map<std::string, std::pair<float, float>> shapePositions;
  for (auto &sh : shapes)
    shapePositions[sh.name] = {sh.x, sh.y};

  std::string gradJS = "[";
  for (int si = 0; si < (int)shapes.size(); si++) {
    if (si > 0)
      gradJS += ",";
    gradJS += "{name:'" + EscJS(shapes[si].name) + "'";
    gradJS += ",parent:'" + EscJS(shapes[si].parent) + "'";
    gradJS += ",type:'" + EscJS(shapes[si].type) + "'";
    if (shapes[si].type == "solid") {
      gradJS += ",color:[" + F(shapes[si].color.r) + "," +
                F(shapes[si].color.g) + "," + F(shapes[si].color.b) + "]";
    }
    gradJS += ",gsX:" + F(shapes[si].gsX) + ",gsY:" + F(shapes[si].gsY) +
              ",geX:" + F(shapes[si].geX) + ",geY:" + F(shapes[si].geY);
    gradJS += ",x:" + F(shapes[si].x) + ",y:" + F(shapes[si].y);
    gradJS += ",opacity:" + F(shapes[si].opacity);
    float px = 0.f, py = 0.f;
    if (!shapes[si].parent.empty()) {
      auto it = shapePositions.find(shapes[si].parent);
      if (it != shapePositions.end()) {
        px = it->second.first;
        py = it->second.second;
      }
    }
    gradJS += ",px:" + F(px) + ",py:" + F(py);
    gradJS += ",stops:[";
    for (int ki = 0; ki < (int)shapes[si].stops.size(); ki++) {
      if (ki > 0)
        gradJS += ",";
      gradJS += "{pos:" + F(shapes[si].stops[ki].pos) +
                ",r:" + F(shapes[si].stops[ki].r) +
                ",g:" + F(shapes[si].stops[ki].g) +
                ",b:" + F(shapes[si].stops[ki].b) +
                ",a:" + F(shapes[si].stops[ki].a) + "}";
    }
    gradJS += "]";
    gradJS += "}";
  }
  gradJS += "]";

  std::string groupNameMapJS = "{";
  for (auto &kv : groupNameToOrig)
    groupNameMapJS += "'" + EscJS(kv.first) + "':'" + EscJS(kv.second) + "',";
  groupNameMapJS += "}";

  std::string tempPathStr =
      std::string(std::getenv("TEMP")) + "\\ae_nested_ready.aepx";
  for (size_t c = 0; c < tempPathStr.length(); c++)
    if (tempPathStr[c] == '\\')
      tempPathStr[c] = '/';
  WriteVetoresAEPX(shapes, tempPathStr, groupTpl);

  std::string js;
  js += "(function(){try{\n";
  js += "var grads=" + gradJS + ";\n";
  js += "var groupNameMap=" + groupNameMapJS + ";\n";
  js += "var comp=app.project.activeItem;\n";
  js += "if(!comp||!(comp instanceof CompItem)){alert('Abra uma "
        "comp!');return;}\n";

  js += "var layerNamesMulti = {};\n";
  js += "for(var k=1; k<=comp.numLayers; k++){\n";
  js += "  var nm=comp.layer(k).name;\n";
  js += "  if(!layerNamesMulti[nm]) layerNamesMulti[nm]=[];\n";
  js += "  layerNamesMulti[nm].push(k);\n";
  js += "}\n";
  js += "var hasFlatGradients = false;\n";
  js += "for(var g=0; g<grads.length; g++){\n";
  js += "  var tgtNm = grads[g].name; if(groupNameMap[tgtNm]) "
        "tgtNm=groupNameMap[tgtNm];\n";
  js += "  if(layerNamesMulti[tgtNm] || layerNamesMulti[grads[g].name]) { "
        "hasFlatGradients = true; break; }\n";
  js += "}\n";
  js += "var isNested = !hasFlatGradients;\n";

  js += "if(isNested){\n";
  js += "  app.beginUndoGroup('Importar Nested Group');\n";
  js += "  var tempF = new File('" + tempPathStr + "');\n";
  js += "  var vComp = null, vImp = null;\n";
  js += "  if(tempF.exists){\n";
  js += "    vImp = app.project.importFile(new ImportOptions(tempF));\n";
  js += "    vComp = vImp instanceof FolderItem ? vImp.item(1) : vImp;\n";
  js += "  }\n";
  js += "  if(vComp && vComp.numLayers > 0){\n";
  js += "    var mestre = vComp.layer(1);\n";
  js += "    var conteudo = mestre.property('ADBE Root Vectors Group');\n";
  js += "    for(var i=50; i>grads.length; i--){\n";
  js += "      try{conteudo.property(i).remove();}catch(e){}\n";
  js += "    }\n";
  js += "    for(var gi=0; gi<grads.length; gi++) {\n";
  js += "      var gd = grads[gi]; var trgNm = gd.name; "
        "if(groupNameMap[gd.name]) trgNm = groupNameMap[gd.name];\n";
  js += "      try{ \n";
  js += "        var grp = conteudo.property(gi+1);\n";
  js += "        grp.name = trgNm;\n";
  js += "        if(gd.type !== 'solid'){\n";
  js += "          var fill = grp.property('ADBE Vectors Group').property('ADBE Vector Graphic - G-Fill');\n";
  js += "          var vgrpPaths = grp.property('ADBE Vectors Group');\n";
  js += "          for(var vf=vgrpPaths.numProperties; vf>=1; vf--){ if(vgrpPaths.property(vf).matchName==='ADBE Vector Graphic - Fill') vgrpPaths.property(vf).remove(); }\n";
  js += "          if(fill){\n";
  js += "            try{fill.property('Ponto inicial').setValue([gd.gsX + (gd.x||0), gd.gsY + (gd.y||0)]);}catch(e){try{fill.property('ADBE Vector Grad Start Pt').setValue([gd.gsX + (gd.x||0), gd.gsY + (gd.y||0)]);}catch(e2){}}\n";
  js += "            try{fill.property('Ponto final').setValue([gd.geX + (gd.x||0), gd.geY + (gd.y||0)]);}catch(e){try{fill.property('ADBE Vector Grad End Pt').setValue([gd.geX + (gd.x||0), gd.geY + (gd.y||0)]);}catch(e2){}}\n";
  js += "          }\n";
  js += "        }\n";
  js += "      }catch(e){}\n";
  js += "    }\n";
  js += "    mestre.copyToComp(comp);\n";
  js += "    try{if(typeof vImp !== 'undefined' && vImp) "
        "vImp.remove();}catch(e){}\n";
  js += "  }\n";
  js += "} else {\n";
  js += "  app.beginUndoGroup('Importar Split Layer/Group');\n";
  js += "  // Detect Split Group mode: a layer named 'Vetores' exists\n";
  js += "  var vetoresLyr=null;\n";
  js += "  for(var vScan=1; vScan<=comp.numLayers; vScan++) { "
        "if(comp.layer(vScan).name === 'Vetores'){ vetoresLyr = "
        "comp.layer(vScan); break; } }\n";
  js += "  var isSplitGroup=(vetoresLyr!==null);\n";
  js += "\n";
  js += "  // bFile ALWAYS loads ae_batch_temp so each gradient gets its "
        "distinct template layer\n";
  js += "  var bFile = new File('C:/AEGP/ae_batch_temp.aepx');\n";
  js += "  var bComp = null;\n";
  js += "  if(bFile.exists){\n";
  js += "    var bImp = app.project.importFile(new ImportOptions(bFile));\n";
  js += "    if(bImp instanceof FolderItem){\n";
  js += "      for(var fI=1; fI<=bImp.numItems; fI++){ if(bImp.item(fI) "
        "instanceof CompItem){ bComp=bImp.item(fI); break; } }\n";
  js += "    } else { bComp = bImp; }\n";
  js += "  }\n";
  js += "  if(bComp){\n";
  js += "    var gradIndex = 0;\n";
  js += "    var matchedLayers = {};\n";
  js += "    for(var gi=0; gi<grads.length; gi++){\n";
  js += "      var gd=grads[gi];\n";
  js += "      if (gd.type !== 'gradient') continue;\n";
  js += "      gradIndex++;\n";
  js += "      var trgNm = gd.name;\n";
  js += "      var origLyr=null;\n";
  js += "      // Dynamically scan for the original layer to avoid index drift "
        "upon additions/deletions\n";
  js += "      for(var scan=1; scan<=comp.numLayers; scan++) {\n";
  js += "        var scLyr = comp.layer(scan);\n";
  js += "        var scId = scLyr.id || (scan + '_' + scLyr.name);\n";
  js += "        if(scLyr.name === gd.name && !matchedLayers[scId]) {\n";
  js += "           origLyr = scLyr;\n";
  js += "           matchedLayers[scId] = true;\n";
  js += "           break;\n";
  js += "        }\n";
  js += "      }\n";
  js += "      if(!origLyr){ alert('origLyr NULO para: ' + gd.name); continue; "
        "}\n";
  js += "\n";
      // No longer need to extract shapeVal as SplitGroup builds paths natively
  js += "      var bIdx=Math.min(gradIndex,bComp.numLayers);\n";
  js += "\n";
  js += "      if(isSplitGroup && vetoresLyr){\n";
  js += "        if(!bComp) { alert('bComp ta nulo no laco!!'); continue; }\n";
  js += "        if(bComp.numLayers < 1) { alert('BATALHA EPICA: O template ta "
        "VAZIO! numLayers=0! Ele perdeu os shapes!'); continue; }\n";
  js += "        var srcL = bComp.layer(bIdx);\n";
  js += "        if(!srcL) { alert('srcL nulo! bIdx=' + bIdx); continue; }\n";
  js += "        for(var "
        "lx=1;lx<=comp.numLayers;lx++){if(comp.layer(lx).selected){comp.layer("
        "lx).selected=false;}}\n";
  js += "        try { srcL.copyToComp(comp); } catch(ecpy) { alert('Falha no "
        "copyToComp: ' + ecpy.message); continue; }\n";
  js += "        var newLyr = comp.layer(1);\n";
  js += "        if(!newLyr) { alert('newLyr falhou!'); continue; }\n";
  js += "        newLyr.name = gd.name+' (grad)';\n";
  js += "        var vRoot = vetoresLyr.property('ADBE Root Vectors Group');\n";
  js += "        // Find parent group inside Vetores (by gd.parent -> display "
        "name)\n";
  js += "        var parentCont = vRoot;\n";
  js += "        if(gd.parent){\n";
  js += "          var pName = gd.parent;\n";
  js += "          var _findGrp = function(cont) {\n";
  js += "            for(var vp=1; vp<=cont.numProperties; vp++){\n";
  js += "              var p = cont.property(vp);\n";
  js += "              if(p.matchName==='ADBE Vector Group'){\n";
  js += "                if(p.name===pName || p.name.indexOf(pName)===0) "
        "return p.property('ADBE Vectors Group');\n";
  js += "                var found = _findGrp(p.property('ADBE Vectors "
        "Group'));\n";
  js += "                if(found) return found;\n";
  js += "              }\n";
  js += "            }\n";
  js += "            return null;\n";
  js += "          };\n";
  js += "          var foundGrp = _findGrp(vRoot);\n";
  js += "          if(foundGrp) parentCont = foundGrp;\n";
  js += "        }\n";
  js += "        // Create Vector Group for this gradient inside Vetores\n";
  js += "        // Find the existing Vector Group for this gradient inside Vetores (already created by SplitGroup native)\n";
  js += "        var gradVG = null;\n";
  js += "        for(var vf=1; vf<=parentCont.numProperties; vf++){ if(parentCont.property(vf).name === (trgNm||gd.name)){ gradVG = parentCont.property(vf); break; } }\n";
  js += "        if(!gradVG){ try{newLyr.remove();}catch(e){} continue; }\n";
  js += "        var gradCont = gradVG.property('ADBE Vectors Group');\n";
  js += "        // Remove old native fallback fill placed by SplitGroup.jsx\n";
  js += "        for(var vf=gradCont.numProperties; vf>=1; vf--){ if(gradCont.property(vf).matchName==='ADBE Vector Graphic - Fill') gradCont.property(vf).remove(); }\n";
  js += "        // Get G-Fill from the batch template copy (has injected colors)\n";
  js += "        var srcGFill=null;\n";
  js += "        var nlRoot=newLyr.property('ADBE Root Vectors Group');\n";
  js += "        for(var nj=1;nj<=nlRoot.numProperties;nj++){\n";
  js += "          var nlGrp=nlRoot.property(nj); if(nlGrp.matchName!=='ADBE "
        "Vector Group')continue;\n";
  js += "          var nlCont=nlGrp.property('ADBE Vectors Group');\n";
  js +=
      "          for(var "
      "nk=1;nk<=nlCont.numProperties;nk++){if(nlCont.property(nk).matchName==='"
      "ADBE Vector Graphic - G-Fill'){srcGFill=nlCont.property(nk);break;}}\n";
  js += "          if(srcGFill)break;\n";
  js += "        }\n";
  js += "        // Use Copy/Paste to transfer the G-Fill (preserves GCky "
        "colors accurately!)\n";
  js += "        if(srcGFill) {\n";
  js += "            try {\n";
  js += "              for(var "
        "lidx=1;lidx<=comp.numLayers;lidx++){if(comp.layer(lidx).selected){"
        "comp.layer(lidx).selected=false;}}\n";
  js += "              var selProps = comp.selectedProperties; for(var spi=0; "
        "spi<selProps.length; spi++){ "
        "try{selProps[spi].selected=false;}catch(ee){} }\n";
  js += "              srcGFill.selected = true;\n";
  js += "              app.executeCommand(19); // Copy\n";
  js += "              for(var "
        "lidx=1;lidx<=comp.numLayers;lidx++){if(comp.layer(lidx).selected){"
        "comp.layer(lidx).selected=false;}}\n";
  js += "              selProps = comp.selectedProperties; for(var spi=0; "
        "spi<selProps.length; spi++){ "
        "try{selProps[spi].selected=false;}catch(ee){} }\n";
  js += "              gradVG.selected = true;\n";
  js += "              app.executeCommand(20); // Paste\n";
  js += "            } catch(eCP) { alert('Paste Error: '+eCP.message); }\n";
  js += "        }\n";
  js += "        // Find the freshly pasted G-Fill and move to BOTTOM\n";
  js += "        // AE rule: fill BELOW paths (higher index) applies to paths above.\n";
  js += "        // Paste puts G-Fill at index 1 (top) pushing paths down = invisible!\n";
  js += "        var gradFill = null;\n";
  js += "        for(var ng=1;ng<=gradCont.numProperties;ng++){\n";
  js += "          if(gradCont.property(ng).matchName==='ADBE Vector Graphic - G-Fill'){\n";
  js += "            gradFill=gradCont.property(ng);\n";
  js += "            try{ gradFill.moveTo(gradCont.numProperties); }catch(emv){}\n";
  js += "            gradFill=gradCont.property(gradCont.numProperties);\n";
  js += "            break;\n";
  js += "          }\n";
  js += "        }\n";
  js +=
      "        var gradVGT = gradVG.property('ADBE Vector Transform Group');\n";
  js += "        try{gradVGT.property('ADBE Vector Position').setValue([0, "
        "0]);}catch(evt){}\n";
  js += "        try{gradVGT.property('ADBE Vector "
        "Anchor').setValue([0,0]);}catch(eva){}\n";
  js += "        // Aplicar opacidade do shape original (gd.opacity 0-1 -> 0-100)\n";
  js += "        if(gd.opacity !== undefined && gd.opacity !== null){\n";
  js += "          var opPct = (gd.opacity <= 1.0) ? gd.opacity * 100 : gd.opacity;\n";
  js += "          try{gradVGT.property('ADBE Vector Opacity').setValue(opPct);}catch(eoVG){}\n";
  js += "        }\n";
  js += "        if(gradFill) {\n";
  js += "            try{gradFill.property('Ponto inicial').setValue([gd.gsX + (gd.x||0), gd.gsY + (gd.y||0)]);}catch(e){try{gradFill.property('ADBE Vector Grad Start Pt').setValue([gd.gsX + (gd.x||0), gd.gsY + (gd.y||0)]);}catch(e2){}}\n";
  js += "            try{gradFill.property('Ponto final').setValue([gd.geX + (gd.x||0), gd.geY + (gd.y||0)]);}catch(e){try{gradFill.property('ADBE Vector Grad End Pt').setValue([gd.geX + (gd.x||0), gd.geY + (gd.y||0)]);}catch(e2){}}\n";
  js += "        }\n";
  js += "        // Remove the temp standalone layers\n";
  js += "        try{newLyr.remove();}catch(e){}\n";
  js += "        try{origLyr.remove();}catch(e){}\n";
  js += "\n";
  js += "      } else {\n";
  js += "        // SPLIT LAYER MODE (SWAP ROBUST SHADOW-BUILD)\n";
  js += "        var newLyr=bComp.layer(bIdx);\n";
  js += "        var newRoot2=newLyr.property('ADBE Root Vectors Group');\n";
  js += "        var newGrp=null;\n";
  js += "        for(var ng2=1;ng2<=newRoot2.numProperties;ng2++){\n";
  js += "          if(newRoot2.property(ng2).matchName==='ADBE Vector "
        "Group'){newGrp=newRoot2.property(ng2);break;}\n";
  js += "        }\n";
  js += "        var newCont2=newGrp?newGrp.property('ADBE Vectors "
        "Group'):newRoot2;\n";
  js += "        var toRem2=[];\n";
  js += "        for(var nk2=1;nk2<=newCont2.numProperties;nk2++){\n";
  js += "          if(newCont2.property(nk2).matchName!=='ADBE Vector Graphic "
        "- G-Fill'){toRem2.push(newCont2.property(nk2));}\n";
  js += "        }\n";
  js +=
      "        for(var "
      "ri2=0;ri2<toRem2.length;ri2++){try{toRem2[ri2].remove();}catch(e){}}\n";
  js += "        var oRoot2=origLyr.property('ADBE Root Vectors Group');\n";
  js += "        var addedShapes=0;\n";
  js += "        for(var oj2=1;oj2<=oRoot2.numProperties;oj2++){\n";
  js += "          var oGrp2=oRoot2.property(oj2);\n";
  js += "          if(oGrp2.matchName!=='ADBE Vector Group')continue;\n";
  js += "          var oCont2=oGrp2.property('ADBE Vectors Group');\n";
  js += "          for(var ok2=1;ok2<=oCont2.numProperties;ok2++){\n";
  js += "            var oP2=oCont2.property(ok2);\n";
  js += "            if(oP2.matchName==='ADBE Vector Shape - Group'){\n";
  js += "              try{\n";
  js += "                var sv2=oP2.property('ADBE Vector Shape').value;\n";
  js += "                if(sv2&&sv2.vertices&&sv2.vertices.length>=2){\n";
  js += "                  var np2=newCont2.addProperty('ADBE Vector Shape - "
        "Group');\n";
  js += "                  np2.property('ADBE Vector Shape').setValue(sv2);\n";
  js += "                  np2.moveTo(1); addedShapes++;\n";
  js += "                }\n";
  js += "              }catch(eS){}\n";
  js +=
      "            } else if(oP2.matchName==='ADBE Vector Filter - Merge'){\n";
  js += "              try{var mp2=newCont2.addProperty('ADBE Vector Filter - "
        "Merge');mp2.property('ADBE Vector Merge "
        "Type').setValue(oP2.property('ADBE Vector Merge "
        "Type').value);}catch(eM){}\n";
  js += "            }\n";
  js += "          }\n";
  js += "        }\n";
  js += "        // Se nao achou shapes no origLyr, usa a rect do template "
        "(mas ainda injeta o gradiente)\n";
  js += "        if(addedShapes<1){\n";
  js += "          try{newLyr.comment='FALLBACK_RECT';}catch(e){}\n";
  js += "        }\n";
  js += "        if(newGrp){\n";
  js += "          newGrp.name=gd.name;\n";
  js += "          var vgt2=newGrp.property('ADBE Vector Transform Group');\n";
  js += "          try{var pv=vgt2.property('ADBE Vector Position'); "
        "if(pv)pv.setValue(pv.value.length===3?[0,0,0]:[0,0]);}catch(e){}\n";
  js += "          try{var av=vgt2.property('ADBE Vector Anchor'); "
        "if(av)av.setValue(av.value.length===3?[0,0,0]:[0,0]);}catch(e){}\n";
  js += "          try{var sv=vgt2.property('ADBE Vector Scale'); "
        "if(sv)sv.setValue(sv.value.length===3?[100,100,100]:[100,100]);}catch("
        "e){}\n";
  js += "          try{var rv=vgt2.property('ADBE Vector Rotation'); "
        "if(rv)rv.setValue(0);}catch(e){}\n";
  js += "        }\n";
  js += "        var gFill2=null;\n";
  js += "        for(var gf2=1;gf2<=newCont2.numProperties;gf2++){\n";
  js += "          if(newCont2.property(gf2).matchName==='ADBE Vector Graphic "
        "- G-Fill'){gFill2=newCont2.property(gf2);break;}\n";
  js += "        }\n";
  js += "        if(gFill2){\n";
  js += "          try{gFill2.property('Ponto "
        "inicial').setValue([gd.gsX,gd.gsY]);}catch(e){try{gFill2.property('"
        "ADBE Vector Grad Start Pt').setValue([gd.gsX,gd.gsY]);}catch(e2){}}\n";
  js += "          try{gFill2.property('Ponto "
        "final').setValue([gd.geX,gd.geY]);}catch(e){try{gFill2.property('ADBE "
        "Vector Grad End Pt').setValue([gd.geX,gd.geY]);}catch(e2){}}\n";
  js += "          try{gFill2.property('Fill "
        "Rule').setValue(2);}catch(e){try{gFill2.property('ADBE Vector Fill "
        "Rule').setValue(2);}catch(e2){}}\n";
  js += "        }\n";
  js += "        var oMask=origLyr.property('ADBE Mask Parade'); var "
        "nMask=newLyr.property('ADBE Mask Parade');\n";
  js += "        if(oMask&&nMask){for(var "
        "mi=1;mi<=oMask.numProperties;mi++){try{var nm=nMask.addProperty('ADBE "
        "Mask Atom');nm.property('ADBE Mask "
        "Shape').setValue(oMask.property(mi).property('ADBE Mask "
        "Shape').value);nm.property('ADBE Mask "
        "Mode').setValue(oMask.property(mi).property('ADBE Mask "
        "Mode').value);nm.property('ADBE Mask "
        "Opacity').setValue(oMask.property(mi).property('ADBE Mask "
        "Opacity').value);}catch(me){}}}\n";
  js += "        // --- ALL GEOMETRY DONE! COPY TO COMP NOW! ---\n";
  js += "        newLyr.copyToComp(comp);\n";
  js += "        var finalLyr=comp.layer(1);\n";
  js += "        var ot2=origLyr.property('ADBE Transform Group');\n";
  js += "        var nt2=finalLyr.property('ADBE Transform Group');\n";
  js += "        try{finalLyr.parent=origLyr.parent;}catch(e){}\n";
  js += "        try{nt2.property('ADBE Position').setValue(ot2.property('ADBE "
        "Position').value);}catch(e){}\n";
  js +=
      "        try{nt2.property('ADBE Anchor "
      "Point').setValue(ot2.property('ADBE Anchor Point').value);}catch(e){}\n";
  js += "        try{nt2.property('ADBE Scale').setValue(ot2.property('ADBE "
        "Scale').value);}catch(e){}\n";
  js += "        try{nt2.property('ADBE Rotation').setValue(ot2.property('ADBE "
        "Rotation').value);}catch(e){}\n";
  js += "        try{nt2.property('ADBE Opacity').setValue(ot2.property('ADBE "
        "Opacity').value);}catch(e){}\n";
  js += "        try{ if(origLyr.hasTrackMatte){ var "
        "tmL=origLyr.trackMatteLayer; var tmT=origLyr.trackMatteType; if(tmL){ "
        "finalLyr.setTrackMatte(tmL, tmT); } else { finalLyr.trackMatteType = "
        "tmT; } } }catch(eTM){}\n";
  js += "        finalLyr.name=origLyr.name;\n";
  js += "        try{finalLyr.moveBefore(origLyr);}catch(e){}\n";
  js += "        try{origLyr.remove();}catch(e){}\n";
  js += "      }\n";
  js += "    }\n";
  js += "    try{ if(typeof bImp!=='undefined' && bImp) bImp.remove(); "
        "}catch(e){}\n";
  js += "  }\n";
  js += "  app.endUndoGroup();\n";
  js += "}\n";
  js += "comp.openInViewer();\n";
  js += "}catch(e){alert('GRAD FIXER ERRO: '+e.message+' "
        "(L'+e.line+')');}})();\n";

  char *buf = (char *)malloc(js.length() + 1);
  if (buf) {
    strcpy_s(buf, js.length() + 1, js.c_str());
    AEGP_MemHandle resH = NULL, errH = NULL;
    suites.UtilitySuite6()->AEGP_ExecuteScript(S_my_id, buf, FALSE, &resH,
                                               &errH);
    if (resH)
      suites.MemorySuite1()->AEGP_FreeMemHandle(resH);
    if (errH)
      suites.MemorySuite1()->AEGP_FreeMemHandle(errH);
    free(buf);
  }
  return A_Err_NONE;
}

static A_Err CommandHook(AEGP_GlobalRefcon, AEGP_CommandRefcon,
                         AEGP_Command cmd, AEGP_HookPriority, A_Boolean,
                         A_Boolean *handled) {
  if (cmd == S_cmd) {
    *handled = TRUE;
    AEGP_SuiteHandler suites(sP);
    return ApplyGradientsToExistingLayers(suites);
  }
  return A_Err_NONE;
}
static A_Err UpdateMenuHook(AEGP_GlobalRefcon, AEGP_UpdateMenuRefcon,
                            AEGP_WindowType) {
  AEGP_SuiteHandler suites(sP);
  suites.CommandSuite1()->AEGP_EnableCommand(S_cmd);
  return A_Err_NONE;
}
extern "C" __declspec(dllexport) A_Err EntryPointFunc(struct SPBasicSuite *pica,
                                                      A_long, A_long,
                                                      AEGP_PluginID id,
                                                      AEGP_GlobalRefcon *) {
  S_my_id = id;
  sP = pica;
  AEGP_SuiteHandler suites(pica);
  suites.CommandSuite1()->AEGP_GetUniqueCommand(&S_cmd);
  suites.CommandSuite1()->AEGP_InsertMenuCommand(
      S_cmd, "GRAD FIXER: Aplicar Gradientes", AEGP_Menu_LAYER,
      AEGP_MENU_INSERT_AT_BOTTOM);
  suites.RegisterSuite5()->AEGP_RegisterCommandHook(
      S_my_id, AEGP_HP_BeforeAE, AEGP_Command_ALL, CommandHook, 0);
  suites.RegisterSuite5()->AEGP_RegisterUpdateMenuHook(S_my_id, UpdateMenuHook,
                                                       0);
  return A_Err_NONE;
}