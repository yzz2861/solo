import { app as F, ipcMain as p, dialog as j, BrowserWindow as Et } from "electron";
import I from "path";
import It from "better-sqlite3";
import y from "fs";
import Dt from "pdfmake";
let C = null;
function K() {
  const t = F.getPath("userData"), e = I.join(t, "data");
  return y.existsSync(e) || y.mkdirSync(e, { recursive: !0 }), I.join(e, "tattoo-studio.db");
}
function pt() {
  const t = F.getPath("userData"), e = I.join(t, "images");
  return y.existsSync(e) || y.mkdirSync(e, { recursive: !0 }), e;
}
function mt() {
  if (C) return C;
  const t = K();
  return C = new It(t), C.pragma("journal_mode = WAL"), C.pragma("foreign_keys = ON"), Rt(C), Ot(C), C;
}
function Rt(t) {
  t.exec(`
    CREATE TABLE IF NOT EXISTS artists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      specialty TEXT,
      avatar_path TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      wechat_id TEXT,
      birthday DATE,
      allergies TEXT,
      contraindications TEXT,
      is_sensitive_skin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS body_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      is_sensitive INTEGER DEFAULT 0,
      diagram_path TEXT
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      artist_id INTEGER NOT NULL,
      body_part_id INTEGER,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      estimated_duration INTEGER,
      status TEXT DEFAULT 'pending_deposit',
      internal_notes TEXT,
      client_notes TEXT,
      is_sensitive_area INTEGER DEFAULT 0,
      revision_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (artist_id) REFERENCES artists(id),
      FOREIGN KEY (body_part_id) REFERENCES body_parts(id)
    );

    CREATE TABLE IF NOT EXISTS tattoo_designs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      booking_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      current_version INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS design_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      design_id INTEGER NOT NULL,
      version_number INTEGER NOT NULL,
      image_path TEXT NOT NULL,
      feedback TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (design_id) REFERENCES tattoo_designs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      screenshot_path TEXT,
      paid_at DATETIME,
      payment_method TEXT,
      notes TEXT,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_artist_time ON bookings(artist_id, start_time);
    CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings(client_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(DATE(start_time));
  `);
}
function Ot(t) {
  const e = [
    { id: 1, name: "上臂", category: "上肢", is_sensitive: 0 },
    { id: 2, name: "小臂", category: "上肢", is_sensitive: 0 },
    { id: 3, name: "大臂内侧", category: "上肢", is_sensitive: 1 },
    { id: 4, name: "大腿", category: "下肢", is_sensitive: 0 },
    { id: 5, name: "小腿", category: "下肢", is_sensitive: 0 },
    { id: 6, name: "脚踝", category: "下肢", is_sensitive: 0 },
    { id: 7, name: "后背", category: "躯干", is_sensitive: 0 },
    { id: 8, name: "前胸", category: "躯干", is_sensitive: 1 },
    { id: 9, name: "侧腰", category: "躯干", is_sensitive: 0 },
    { id: 10, name: "颈部", category: "头颈", is_sensitive: 1 },
    { id: 11, name: "手腕", category: "上肢", is_sensitive: 0 },
    { id: 12, name: "肋骨", category: "躯干", is_sensitive: 1 }
  ], n = t.prepare(`
    INSERT OR IGNORE INTO body_parts (id, name, category, is_sensitive)
    VALUES (@id, @name, @category, @is_sensitive)
  `);
  t.transaction(() => {
    for (const h of e)
      n.run(h);
  })();
  const _ = [
    { id: 1, name: "阿龙", specialty: "传统日式、黑灰写实" },
    { id: 2, name: "小雨", specialty: "小清新、彩色水彩" },
    { id: 3, name: "老王", specialty: "Old School、黑臂" }
  ], c = t.prepare(`
    INSERT OR IGNORE INTO artists (id, name, specialty)
    VALUES (@id, @name, @specialty)
  `);
  t.transaction(() => {
    for (const h of _)
      c.run(h);
  })();
}
function g() {
  return C || mt();
}
function At(t) {
  const e = g();
  let n = `
    SELECT * FROM clients 
    WHERE 1=1
  `;
  const i = {};
  return t != null && t.keyword && (n += " AND (name LIKE @keyword OR phone LIKE @keyword OR wechat_id LIKE @keyword)", i.keyword = `%${t.keyword}%`), t != null && t.hasAllergies && (n += " AND (allergies IS NOT NULL AND allergies != '' OR is_sensitive_skin = 1)"), n += " ORDER BY updated_at DESC", e.prepare(n).all(i);
}
function it(t) {
  return g().prepare("SELECT * FROM clients WHERE id = ?").get(t);
}
function Lt(t) {
  const e = g(), n = (/* @__PURE__ */ new Date()).toISOString();
  if (t.id)
    return e.prepare(`
      UPDATE clients 
      SET name = @name,
          phone = @phone,
          wechat_id = @wechat_id,
          birthday = @birthday,
          allergies = @allergies,
          contraindications = @contraindications,
          is_sensitive_skin = @is_sensitive_skin,
          updated_at = @updated_at
      WHERE id = @id
    `).run({
      ...t,
      updated_at: n
    }), it(t.id);
  {
    const _ = e.prepare(`
      INSERT INTO clients (name, phone, wechat_id, birthday, allergies, contraindications, is_sensitive_skin, created_at, updated_at)
      VALUES (@name, @phone, @wechat_id, @birthday, @allergies, @contraindications, @is_sensitive_skin, @created_at, @updated_at)
    `).run({
      ...t,
      created_at: n,
      updated_at: n
    });
    return it(_.lastInsertRowid);
  }
}
function $t(t) {
  return g().prepare("DELETE FROM clients WHERE id = ?").run(t).changes > 0;
}
function Mt(t = !0) {
  const e = g();
  let n = "SELECT * FROM artists";
  return t && (n += " WHERE is_active = 1"), n += " ORDER BY name", e.prepare(n).all();
}
function dt(t) {
  return g().prepare("SELECT * FROM artists WHERE id = ?").get(t);
}
function wt(t) {
  const e = g(), n = (/* @__PURE__ */ new Date()).toISOString();
  if (t.id)
    return e.prepare(`
      UPDATE artists 
      SET name = @name,
          specialty = @specialty,
          avatar_path = @avatar_path,
          is_active = @is_active
      WHERE id = @id
    `).run(t), dt(t.id);
  {
    const _ = e.prepare(`
      INSERT INTO artists (name, specialty, avatar_path, is_active, created_at)
      VALUES (@name, @specialty, @avatar_path, @is_active, @created_at)
    `).run({
      ...t,
      is_active: t.is_active ?? 1,
      created_at: n
    });
    return dt(_.lastInsertRowid);
  }
}
function Ft() {
  return g().prepare("SELECT * FROM body_parts ORDER BY category, name").all();
}
function Ct(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var V = { exports: {} }, xt = V.exports, ct;
function kt() {
  return ct || (ct = 1, (function(t, e) {
    (function(n, i) {
      t.exports = i();
    })(xt, (function() {
      var n = 1e3, i = 6e4, _ = 36e5, c = "millisecond", T = "second", h = "minute", $ = "hour", E = "day", b = "week", D = "month", x = "quarter", M = "year", k = "date", tt = "Invalid Date", at = /^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/, bt = /\[([^\]]+)]|YYYY|YY|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g, Nt = { name: "en", weekdays: "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"), months: "January_February_March_April_May_June_July_August_September_October_November_December".split("_"), ordinal: function(d) {
        var r = ["th", "st", "nd", "rd"], s = d % 100;
        return "[" + d + (r[(s - 20) % 10] || r[s] || r[0]) + "]";
      } }, et = function(d, r, s) {
        var o = String(d);
        return !o || o.length >= r ? d : "" + Array(r + 1 - o.length).join(s) + d;
      }, St = { s: et, z: function(d) {
        var r = -d.utcOffset(), s = Math.abs(r), o = Math.floor(s / 60), a = s % 60;
        return (r <= 0 ? "+" : "-") + et(o, 2, "0") + ":" + et(a, 2, "0");
      }, m: function d(r, s) {
        if (r.date() < s.date()) return -d(s, r);
        var o = 12 * (s.year() - r.year()) + (s.month() - r.month()), a = r.clone().add(o, D), l = s - a < 0, u = r.clone().add(o + (l ? -1 : 1), D);
        return +(-(o + (s - a) / (l ? a - u : u - a)) || 0);
      }, a: function(d) {
        return d < 0 ? Math.ceil(d) || 0 : Math.floor(d);
      }, p: function(d) {
        return { M: D, y: M, w: b, d: E, D: k, h: $, m: h, s: T, ms: c, Q: x }[d] || String(d || "").toLowerCase().replace(/s$/, "");
      }, u: function(d) {
        return d === void 0;
      } }, X = "en", H = {};
      H[X] = Nt;
      var rt = "$isDayjsObject", nt = function(d) {
        return d instanceof q || !(!d || !d[rt]);
      }, J = function d(r, s, o) {
        var a;
        if (!r) return X;
        if (typeof r == "string") {
          var l = r.toLowerCase();
          H[l] && (a = l), s && (H[l] = s, a = l);
          var u = r.split("-");
          if (!a && u.length > 1) return d(u[0]);
        } else {
          var f = r.name;
          H[f] = r, a = f;
        }
        return !o && a && (X = a), a || !o && X;
      }, N = function(d, r) {
        if (nt(d)) return d.clone();
        var s = typeof r == "object" ? r : {};
        return s.date = d, s.args = arguments, new q(s);
      }, m = St;
      m.l = J, m.i = nt, m.w = function(d, r) {
        return N(d, { locale: r.$L, utc: r.$u, x: r.$x, $offset: r.$offset });
      };
      var q = (function() {
        function d(s) {
          this.$L = J(s.locale, null, !0), this.parse(s), this.$x = this.$x || s.x || {}, this[rt] = !0;
        }
        var r = d.prototype;
        return r.parse = function(s) {
          this.$d = (function(o) {
            var a = o.date, l = o.utc;
            if (a === null) return /* @__PURE__ */ new Date(NaN);
            if (m.u(a)) return /* @__PURE__ */ new Date();
            if (a instanceof Date) return new Date(a);
            if (typeof a == "string" && !/Z$/i.test(a)) {
              var u = a.match(at);
              if (u) {
                var f = u[2] - 1 || 0, v = (u[7] || "0").substring(0, 3);
                return l ? new Date(Date.UTC(u[1], f, u[3] || 1, u[4] || 0, u[5] || 0, u[6] || 0, v)) : new Date(u[1], f, u[3] || 1, u[4] || 0, u[5] || 0, u[6] || 0, v);
              }
            }
            return new Date(a);
          })(s), this.init();
        }, r.init = function() {
          var s = this.$d;
          this.$y = s.getFullYear(), this.$M = s.getMonth(), this.$D = s.getDate(), this.$W = s.getDay(), this.$H = s.getHours(), this.$m = s.getMinutes(), this.$s = s.getSeconds(), this.$ms = s.getMilliseconds();
        }, r.$utils = function() {
          return m;
        }, r.isValid = function() {
          return this.$d.toString() !== tt;
        }, r.isSame = function(s, o) {
          var a = N(s);
          return this.startOf(o) <= a && a <= this.endOf(o);
        }, r.isAfter = function(s, o) {
          return N(s) < this.startOf(o);
        }, r.isBefore = function(s, o) {
          return this.endOf(o) < N(s);
        }, r.$g = function(s, o, a) {
          return m.u(s) ? this[o] : this.set(a, s);
        }, r.unix = function() {
          return Math.floor(this.valueOf() / 1e3);
        }, r.valueOf = function() {
          return this.$d.getTime();
        }, r.startOf = function(s, o) {
          var a = this, l = !!m.u(o) || o, u = m.p(s), f = function(Y, O) {
            var U = m.w(a.$u ? Date.UTC(a.$y, O, Y) : new Date(a.$y, O, Y), a);
            return l ? U : U.endOf(E);
          }, v = function(Y, O) {
            return m.w(a.toDate()[Y].apply(a.toDate("s"), (l ? [0, 0, 0, 0] : [23, 59, 59, 999]).slice(O)), a);
          }, S = this.$W, R = this.$M, w = this.$D, W = "set" + (this.$u ? "UTC" : "");
          switch (u) {
            case M:
              return l ? f(1, 0) : f(31, 11);
            case D:
              return l ? f(1, R) : f(0, R + 1);
            case b:
              var P = this.$locale().weekStart || 0, B = (S < P ? S + 7 : S) - P;
              return f(l ? w - B : w + (6 - B), R);
            case E:
            case k:
              return v(W + "Hours", 0);
            case $:
              return v(W + "Minutes", 1);
            case h:
              return v(W + "Seconds", 2);
            case T:
              return v(W + "Milliseconds", 3);
            default:
              return this.clone();
          }
        }, r.endOf = function(s) {
          return this.startOf(s, !1);
        }, r.$set = function(s, o) {
          var a, l = m.p(s), u = "set" + (this.$u ? "UTC" : ""), f = (a = {}, a[E] = u + "Date", a[k] = u + "Date", a[D] = u + "Month", a[M] = u + "FullYear", a[$] = u + "Hours", a[h] = u + "Minutes", a[T] = u + "Seconds", a[c] = u + "Milliseconds", a)[l], v = l === E ? this.$D + (o - this.$W) : o;
          if (l === D || l === M) {
            var S = this.clone().set(k, 1);
            S.$d[f](v), S.init(), this.$d = S.set(k, Math.min(this.$D, S.daysInMonth())).$d;
          } else f && this.$d[f](v);
          return this.init(), this;
        }, r.set = function(s, o) {
          return this.clone().$set(s, o);
        }, r.get = function(s) {
          return this[m.p(s)]();
        }, r.add = function(s, o) {
          var a, l = this;
          s = Number(s);
          var u = m.p(o), f = function(R) {
            var w = N(l);
            return m.w(w.date(w.date() + Math.round(R * s)), l);
          };
          if (u === D) return this.set(D, this.$M + s);
          if (u === M) return this.set(M, this.$y + s);
          if (u === E) return f(1);
          if (u === b) return f(7);
          var v = (a = {}, a[h] = i, a[$] = _, a[T] = n, a)[u] || 1, S = this.$d.getTime() + s * v;
          return m.w(S, this);
        }, r.subtract = function(s, o) {
          return this.add(-1 * s, o);
        }, r.format = function(s) {
          var o = this, a = this.$locale();
          if (!this.isValid()) return a.invalidDate || tt;
          var l = s || "YYYY-MM-DDTHH:mm:ssZ", u = m.z(this), f = this.$H, v = this.$m, S = this.$M, R = a.weekdays, w = a.months, W = a.meridiem, P = function(O, U, G, z) {
            return O && (O[U] || O(o, l)) || G[U].slice(0, z);
          }, B = function(O) {
            return m.s(f % 12 || 12, O, "0");
          }, Y = W || function(O, U, G) {
            var z = O < 12 ? "AM" : "PM";
            return G ? z.toLowerCase() : z;
          };
          return l.replace(bt, (function(O, U) {
            return U || (function(G) {
              switch (G) {
                case "YY":
                  return String(o.$y).slice(-2);
                case "YYYY":
                  return m.s(o.$y, 4, "0");
                case "M":
                  return S + 1;
                case "MM":
                  return m.s(S + 1, 2, "0");
                case "MMM":
                  return P(a.monthsShort, S, w, 3);
                case "MMMM":
                  return P(w, S);
                case "D":
                  return o.$D;
                case "DD":
                  return m.s(o.$D, 2, "0");
                case "d":
                  return String(o.$W);
                case "dd":
                  return P(a.weekdaysMin, o.$W, R, 2);
                case "ddd":
                  return P(a.weekdaysShort, o.$W, R, 3);
                case "dddd":
                  return R[o.$W];
                case "H":
                  return String(f);
                case "HH":
                  return m.s(f, 2, "0");
                case "h":
                  return B(1);
                case "hh":
                  return B(2);
                case "a":
                  return Y(f, v, !0);
                case "A":
                  return Y(f, v, !1);
                case "m":
                  return String(v);
                case "mm":
                  return m.s(v, 2, "0");
                case "s":
                  return String(o.$s);
                case "ss":
                  return m.s(o.$s, 2, "0");
                case "SSS":
                  return m.s(o.$ms, 3, "0");
                case "Z":
                  return u;
              }
              return null;
            })(O) || u.replace(":", "");
          }));
        }, r.utcOffset = function() {
          return 15 * -Math.round(this.$d.getTimezoneOffset() / 15);
        }, r.diff = function(s, o, a) {
          var l, u = this, f = m.p(o), v = N(s), S = (v.utcOffset() - this.utcOffset()) * i, R = this - v, w = function() {
            return m.m(u, v);
          };
          switch (f) {
            case M:
              l = w() / 12;
              break;
            case D:
              l = w();
              break;
            case x:
              l = w() / 3;
              break;
            case b:
              l = (R - S) / 6048e5;
              break;
            case E:
              l = (R - S) / 864e5;
              break;
            case $:
              l = R / _;
              break;
            case h:
              l = R / i;
              break;
            case T:
              l = R / n;
              break;
            default:
              l = R;
          }
          return a ? l : m.a(l);
        }, r.daysInMonth = function() {
          return this.endOf(D).$D;
        }, r.$locale = function() {
          return H[this.$L];
        }, r.locale = function(s, o) {
          if (!s) return this.$L;
          var a = this.clone(), l = J(s, o, !0);
          return l && (a.$L = l), a;
        }, r.clone = function() {
          return m.w(this.$d, this);
        }, r.toDate = function() {
          return new Date(this.valueOf());
        }, r.toJSON = function() {
          return this.isValid() ? this.toISOString() : null;
        }, r.toISOString = function() {
          return this.$d.toISOString();
        }, r.toString = function() {
          return this.$d.toUTCString();
        }, d;
      })(), ot = q.prototype;
      return N.prototype = ot, [["$ms", c], ["$s", T], ["$m", h], ["$H", $], ["$W", E], ["$M", D], ["$y", M], ["$D", k]].forEach((function(d) {
        ot[d[1]] = function(r) {
          return this.$g(r, d[0], d[1]);
        };
      })), N.extend = function(d, r) {
        return d.$i || (d(r, q, N), d.$i = !0), N;
      }, N.locale = J, N.isDayjs = nt, N.unix = function(d) {
        return N(1e3 * d);
      }, N.en = H[X], N.Ls = H, N.p = {}, N;
    }));
  })(V)), V.exports;
}
var Ut = kt();
const L = /* @__PURE__ */ Ct(Ut);
function st(t) {
  const e = g();
  let n = `
    SELECT 
      b.*,
      c.name as client_name,
      c.phone as client_phone,
      c.allergies as client_allergies,
      c.contraindications as client_contraindications,
      c.is_sensitive_skin as client_is_sensitive_skin,
      a.name as artist_name,
      bp.name as body_part_name,
      bp.is_sensitive as body_part_is_sensitive,
      d.amount as deposit_amount,
      CASE WHEN d.paid_at IS NOT NULL THEN 1 ELSE 0 END as deposit_paid,
      td.name as design_name,
      dv.image_path as design_image_path
    FROM bookings b
    LEFT JOIN clients c ON b.client_id = c.id
    LEFT JOIN artists a ON b.artist_id = a.id
    LEFT JOIN body_parts bp ON b.body_part_id = bp.id
    LEFT JOIN deposits d ON b.id = d.booking_id
    LEFT JOIN tattoo_designs td ON b.id = td.booking_id
    LEFT JOIN (
      SELECT design_id, MAX(version_number) as max_version
      FROM design_versions
      GROUP BY design_id
    ) dv_max ON td.id = dv_max.design_id
    LEFT JOIN design_versions dv ON dv_max.design_id = dv.design_id AND dv_max.max_version = dv.version_number
    WHERE 1=1
  `;
  const i = {};
  return t != null && t.dateRange && (n += " AND DATE(b.start_time) >= DATE(@startDate) AND DATE(b.start_time) <= DATE(@endDate)", i.startDate = t.dateRange[0], i.endDate = t.dateRange[1]), t != null && t.artistId && (n += " AND b.artist_id = @artistId", i.artistId = t.artistId), t != null && t.status && (n += " AND b.status = @status", i.status = t.status), t != null && t.clientId && (n += " AND b.client_id = @clientId", i.clientId = t.clientId), n += " ORDER BY b.start_time ASC", e.prepare(n).all(i);
}
function Q(t) {
  return g().prepare(`
    SELECT 
      b.*,
      c.name as client_name,
      c.phone as client_phone,
      c.allergies as client_allergies,
      c.contraindications as client_contraindications,
      c.is_sensitive_skin as client_is_sensitive_skin,
      a.name as artist_name,
      bp.name as body_part_name,
      bp.is_sensitive as body_part_is_sensitive,
      d.amount as deposit_amount,
      CASE WHEN d.paid_at IS NOT NULL THEN 1 ELSE 0 END as deposit_paid,
      td.name as design_name,
      dv.image_path as design_image_path
    FROM bookings b
    LEFT JOIN clients c ON b.client_id = c.id
    LEFT JOIN artists a ON b.artist_id = a.id
    LEFT JOIN body_parts bp ON b.body_part_id = bp.id
    LEFT JOIN deposits d ON b.id = d.booking_id
    LEFT JOIN tattoo_designs td ON b.id = td.booking_id
    LEFT JOIN (
      SELECT design_id, MAX(version_number) as max_version
      FROM design_versions
      GROUP BY design_id
    ) dv_max ON td.id = dv_max.design_id
    LEFT JOIN design_versions dv ON dv_max.design_id = dv.design_id AND dv_max.max_version = dv.version_number
    WHERE b.id = ?
  `).get(t);
}
function ft(t, e, n, i) {
  const _ = g(), c = 900 * 1e3;
  let T = `
    SELECT 
      b.*,
      c.name as client_name,
      c.phone as client_phone,
      a.name as artist_name,
      bp.name as body_part_name
    FROM bookings b
    LEFT JOIN clients c ON b.client_id = c.id
    LEFT JOIN artists a ON b.artist_id = a.id
    LEFT JOIN body_parts bp ON b.body_part_id = bp.id
    WHERE b.artist_id = @artistId
      AND b.status NOT IN ('cancelled')
  `;
  i && (T += " AND b.id != @excludeId");
  const h = _.prepare(T).all({
    artistId: t,
    excludeId: i
  }), $ = L(e).valueOf(), E = L(n).valueOf(), b = h.filter((D) => {
    const x = L(D.start_time).valueOf(), M = L(D.end_time).valueOf(), k = Math.max(x, $);
    return Math.min(M, E) - k > c;
  });
  return {
    hasConflict: b.length > 0,
    conflictBookings: b
  };
}
function Ht(t) {
  const e = g(), n = (/* @__PURE__ */ new Date()).toISOString(), i = t.is_sensitive_area ?? 0;
  if (t.id)
    return e.prepare(`
      UPDATE bookings 
      SET client_id = @client_id,
          artist_id = @artist_id,
          body_part_id = @body_part_id,
          start_time = @start_time,
          end_time = @end_time,
          estimated_duration = @estimated_duration,
          status = @status,
          internal_notes = @internal_notes,
          client_notes = @client_notes,
          is_sensitive_area = @is_sensitive_area,
          revision_count = @revision_count,
          updated_at = @updated_at
      WHERE id = @id
    `).run({
      ...t,
      is_sensitive_area: i,
      updated_at: n
    }), Q(t.id);
  {
    const c = e.prepare(`
      INSERT INTO bookings (
        client_id, artist_id, body_part_id, start_time, end_time,
        estimated_duration, status, internal_notes, client_notes,
        is_sensitive_area, revision_count, created_at, updated_at
      ) VALUES (
        @client_id, @artist_id, @body_part_id, @start_time, @end_time,
        @estimated_duration, @status, @internal_notes, @client_notes,
        @is_sensitive_area, @revision_count, @created_at, @updated_at
      )
    `).run({
      ...t,
      status: t.status ?? "pending_deposit",
      is_sensitive_area: i,
      revision_count: t.revision_count ?? 0,
      created_at: n,
      updated_at: n
    });
    return Q(c.lastInsertRowid);
  }
}
function Pt(t) {
  return g().prepare(`
    UPDATE bookings 
    SET status = 'cancelled', updated_at = @updated_at
    WHERE id = @id
  `).run({
    id: t,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).changes > 0;
}
function gt(t) {
  const e = L().format("YYYY-MM-DD");
  return st({
    dateRange: [e, e],
    artistId: t
  }).filter((n) => n.status !== "cancelled");
}
function ht(t) {
  const e = g();
  let n = `
    SELECT 
      td.*,
      c.name as client_name
    FROM tattoo_designs td
    LEFT JOIN clients c ON td.client_id = c.id
    WHERE 1=1
  `;
  const i = {};
  return t != null && t.clientId && (n += " AND td.client_id = @clientId", i.clientId = t.clientId), t != null && t.bookingId && (n += " AND td.booking_id = @bookingId", i.bookingId = t.bookingId), n += " ORDER BY td.created_at DESC", e.prepare(n).all(i).map((c) => ({
    ...c,
    versions: Tt(c.id)
  }));
}
function Z(t) {
  const i = g().prepare(`
    SELECT 
      td.*,
      c.name as client_name
    FROM tattoo_designs td
    LEFT JOIN clients c ON td.client_id = c.id
    WHERE td.id = ?
  `).get(t);
  if (i)
    return {
      ...i,
      versions: Tt(i.id)
    };
}
function Tt(t) {
  return g().prepare("SELECT * FROM design_versions WHERE design_id = ? ORDER BY version_number DESC").all(t);
}
function Yt(t, e) {
  const n = pt(), i = I.join(n, `design_${e}`);
  y.existsSync(i) || y.mkdirSync(i, { recursive: !0 });
  const _ = I.extname(t), T = `v_${Date.now()}${_}`, h = I.join(i, T);
  return y.copyFileSync(t, h), { savedPath: h };
}
function Wt(t, e) {
  const n = pt(), i = I.join(n, "deposits");
  y.existsSync(i) || y.mkdirSync(i, { recursive: !0 });
  const _ = I.extname(t), c = Date.now(), T = `booking_${e}_${c}${_}`, h = I.join(i, T);
  return y.copyFileSync(t, h), { savedPath: h };
}
function Xt(t) {
  const e = g(), n = (/* @__PURE__ */ new Date()).toISOString();
  if (t.id) {
    if (e.prepare(`
      UPDATE tattoo_designs 
      SET name = @name,
          description = @description
      WHERE id = @id
    `).run(t), t.image_path) {
      const _ = Z(t.id);
      lt(t.id, t.image_path, t.feedback, _.current_version + 1), e.prepare(`
        UPDATE tattoo_designs 
        SET current_version = current_version + 1
        WHERE id = ?
      `).run(t.id), t.booking_id && e.prepare(`
          UPDATE bookings 
          SET revision_count = revision_count + 1,
              updated_at = @updated_at
          WHERE id = @bookingId
        `).run({ bookingId: t.booking_id, updated_at: n });
    }
    return Z(t.id);
  } else {
    const c = e.prepare(`
      INSERT INTO tattoo_designs (client_id, booking_id, name, description, current_version, created_at)
      VALUES (@client_id, @booking_id, @name, @description, @current_version, @created_at)
    `).run({
      ...t,
      current_version: 1,
      created_at: n
    }).lastInsertRowid;
    return t.image_path && lt(c, t.image_path, t.feedback, 1), Z(c);
  }
}
function lt(t, e, n, i = 1) {
  const _ = g(), T = _.prepare(`
    INSERT INTO design_versions (design_id, version_number, image_path, feedback, created_at)
    VALUES (@design_id, @version_number, @image_path, @feedback, @created_at)
  `).run({
    design_id: t,
    version_number: i,
    image_path: e,
    feedback: n ?? null,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  return _.prepare("SELECT * FROM design_versions WHERE id = ?").get(T.lastInsertRowid);
}
function vt() {
  const t = g(), e = t.prepare(`
    SELECT dv.*, td.name as design_name
    FROM design_versions dv
    JOIN tattoo_designs td ON dv.design_id = td.id
  `).all(), n = t.prepare(`
    SELECT * FROM deposits WHERE screenshot_path IS NOT NULL
  `).all(), i = [], _ = [];
  for (const c of e)
    y.existsSync(c.image_path) ? i.push(c.image_path) : _.push({
      path: c.image_path,
      designId: c.design_id,
      versionId: c.id,
      designName: c.design_name
    });
  for (const c of n)
    y.existsSync(c.screenshot_path) ? i.push(c.screenshot_path) : _.push({
      path: c.screenshot_path,
      designId: 0,
      versionId: c.id,
      designName: `定金凭证-${c.id}`
    });
  return { valid: i, invalid: _ };
}
function Bt(t) {
  return g().prepare("DELETE FROM tattoo_designs WHERE id = ?").run(t).changes > 0;
}
function yt(t) {
  const e = g();
  let n = "SELECT * FROM deposits";
  const i = [];
  return t && (n += " WHERE booking_id = ?", i.push(t)), n += " ORDER BY created_at DESC", e.prepare(n).all(...i);
}
function ut(t) {
  return g().prepare("SELECT * FROM deposits WHERE id = ?").get(t);
}
function Gt(t) {
  const e = g();
  if (t.id)
    e.prepare(`
      UPDATE deposits 
      SET amount = @amount,
          screenshot_path = @screenshot_path,
          paid_at = @paid_at,
          payment_method = @payment_method,
          notes = @notes
      WHERE id = @id
    `).run(t);
  else {
    const i = e.prepare(`
      INSERT INTO deposits (booking_id, amount, screenshot_path, paid_at, payment_method, notes)
      VALUES (@booking_id, @amount, @screenshot_path, @paid_at, @payment_method, @notes)
    `).run(t);
    return t.paid_at && e.prepare(`
        UPDATE bookings 
        SET status = 'confirmed',
            updated_at = @updated_at
        WHERE id = @bookingId
      `).run({
      bookingId: t.booking_id,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }), ut(i.lastInsertRowid);
  }
  return ut(t.id);
}
async function jt() {
  const t = [], e = vt();
  t.push(...Jt(e));
  const n = gt();
  t.push(...qt(n));
  const i = st({ status: "pending_deposit" });
  return t.push(...zt(i)), t.push(...Kt(n)), t.push(...Vt(n)), t;
}
function Jt(t) {
  return t.invalid.map((e) => ({
    id: `image_${e.versionId}`,
    type: "image_invalid",
    level: "error",
    message: `图案"${e.designName}"的图片路径已失效，请重新上传`,
    relatedId: e.designId,
    relatedType: "design"
  }));
}
function qt(t) {
  const e = [];
  for (const n of t)
    (n.body_part_is_sensitive || n.is_sensitive_area) && e.push({
      id: `sensitive_${n.id}`,
      type: "sensitive_area",
      level: "warning",
      message: `客户"${n.client_name}"的${n.body_part_name || "部位"}属于敏感区域，需准备遮挡措施`,
      relatedId: n.id,
      relatedType: "booking"
    }), ft(
      n.artist_id,
      n.start_time,
      n.end_time,
      n.id
    ).hasConflict && e.push({
      id: `conflict_${n.id}`,
      type: "time_conflict",
      level: "error",
      message: `师傅"${n.artist_name}"在${L(n.start_time).format("HH:mm")}时段存在预约冲突`,
      relatedId: n.id,
      relatedType: "booking"
    });
  return e;
}
function zt(t) {
  const e = [], n = L();
  for (const i of t) {
    const _ = L(i.start_time), c = _.diff(n, "day");
    c <= 3 && c >= 0 && e.push({
      id: `deposit_${i.id}`,
      type: "deposit_pending",
      level: "warning",
      message: `客户"${i.client_name}"的预约( ${_.format("MM-DD HH:mm")} )还有${c}天，仍未支付定金`,
      relatedId: i.id,
      relatedType: "booking"
    });
  }
  return e;
}
function Kt(t) {
  return t.filter((e) => e.revision_count >= 3).map((e) => ({
    id: `revision_${e.id}`,
    type: "revision_high",
    level: "info",
    message: `客户"${e.client_name}"的图案已改稿${e.revision_count}次，请确认最终版本`,
    relatedId: e.id,
    relatedType: "booking"
  }));
}
function Vt(t) {
  return t.filter((e) => e.client_allergies || e.client_is_sensitive_skin).map((e) => ({
    id: `allergy_${e.id}`,
    type: "allergy_warning",
    level: "warning",
    message: `客户"${e.client_name}"有过敏史${e.client_is_sensitive_skin ? "或敏感肌肤" : ""}，请注意：${e.client_allergies || "敏感肌肤"}`,
    relatedId: e.id,
    relatedType: "booking"
  }));
}
function Zt() {
  const t = [
    {
      normal: I.join(process.cwd(), "public/fonts/NotoSansSC-Regular.ttf"),
      bold: I.join(process.cwd(), "public/fonts/NotoSansSC-Bold.ttf")
    },
    {
      normal: I.join(__dirname, "../../public/fonts/NotoSansSC-Regular.ttf"),
      bold: I.join(__dirname, "../../public/fonts/NotoSansSC-Bold.ttf")
    },
    {
      normal: "/System/Library/Fonts/PingFang.ttc",
      bold: "/System/Library/Fonts/PingFang.ttc"
    },
    {
      normal: "/System/Library/Fonts/STHeiti Medium.ttc",
      bold: "/System/Library/Fonts/STHeiti Medium.ttc"
    },
    {
      normal: "/System/Library/Fonts/STSong.ttc",
      bold: "/System/Library/Fonts/STSong.ttc"
    }
  ];
  for (const e of t)
    if (y.existsSync(e.normal) && y.existsSync(e.bold) && y.statSync(e.normal).size > 1e4)
      return e;
  return null;
}
function Qt() {
  const t = Zt();
  return t ? {
    fontName: "NotoSansSC",
    fonts: {
      NotoSansSC: t
    }
  } : {
    fontName: "Roboto",
    fonts: {
      Roboto: {
        normal: "Helvetica",
        bold: "Helvetica-Bold",
        italics: "Helvetica-Oblique",
        bolditalics: "Helvetica-BoldOblique"
      }
    }
  };
}
async function te(t, e, n) {
  const i = Q(t);
  if (!i)
    throw new Error("预约不存在");
  const _ = ht({ bookingId: t }), c = yt(t), T = Qt(), h = new Dt(T.fonts), $ = ee(i, _, e, c, T.fontName), E = h.createPdfKitDocument($);
  return new Promise((b, D) => {
    const x = y.createWriteStream(n);
    E.pipe(x), E.end(), x.on("finish", () => {
      b({ success: !0, filePath: n });
    }), x.on("error", (M) => {
      D(M);
    });
  });
}
function ee(t, e, n, i, _ = "NotoSansSC") {
  const c = n === "internal", T = L(t.start_time).format("YYYY年MM月DD日"), h = L(t.start_time).format("HH:mm"), $ = L(t.end_time).format("HH:mm"), E = [];
  if (E.push({
    text: "纹身预约确认单",
    style: "header",
    alignment: "center",
    margin: [0, 0, 0, 20]
  }), E.push({
    text: `版本：${c ? "内部版" : "客户版"}`,
    style: "subheader",
    alignment: "right",
    margin: [0, 0, 0, 10]
  }), E.push({
    table: {
      widths: ["30%", "70%"],
      body: [
        [{ text: "预约编号", style: "label" }, { text: `#${t.id}`, style: "value" }],
        [{ text: "客户姓名", style: "label" }, { text: t.client_name, style: "value" }],
        [{ text: "联系电话", style: "label" }, { text: t.client_phone || "-", style: "value" }],
        [{ text: "预约日期", style: "label" }, { text: T, style: "value" }],
        [{ text: "预约时间", style: "label" }, { text: `${h} - ${$}`, style: "value" }],
        [{ text: "纹身师傅", style: "label" }, { text: t.artist_name, style: "value" }],
        [{ text: "身体部位", style: "label" }, {
          text: c || !t.is_sensitive_area ? t.body_part_name || "-" : "***",
          style: "value"
        }],
        [{ text: "预计时长", style: "label" }, { text: t.estimated_duration ? `${t.estimated_duration}分钟` : "-", style: "value" }],
        [{ text: "改稿次数", style: "label" }, { text: `${t.revision_count}次`, style: "value" }],
        [{ text: "预约状态", style: "label" }, {
          text: ne(t.status),
          style: t.status === "confirmed" ? "valueConfirmed" : "value"
        }]
      ]
    },
    layout: "lightHorizontalLines",
    margin: [0, 0, 0, 20]
  }), e.length > 0) {
    E.push({ text: "图案信息", style: "sectionHeader", margin: [0, 10, 0, 10] });
    for (const b of e)
      E.push({
        text: `图案名称：${b.name}`,
        style: "value",
        margin: [0, 5, 0, 5]
      }), b.description && E.push({
        text: `描述：${b.description}`,
        style: "value",
        margin: [0, 0, 0, 5]
      }), E.push({
        text: `当前版本：v${b.current_version}`,
        style: "value",
        margin: [0, 0, 0, 10]
      });
  }
  if (i.length > 0) {
    E.push({ text: "定金信息", style: "sectionHeader", margin: [0, 10, 0, 10] });
    for (const b of i)
      E.push({
        table: {
          widths: ["30%", "70%"],
          body: [
            [{ text: "定金金额", style: "label" }, { text: `¥${b.amount.toFixed(2)}`, style: "value" }],
            [{ text: "支付状态", style: "label" }, {
              text: b.paid_at ? `已支付 (${L(b.paid_at).format("YYYY-MM-DD")})` : "未支付",
              style: b.paid_at ? "valueConfirmed" : "value"
            }],
            [{ text: "支付方式", style: "label" }, { text: b.payment_method || "-", style: "value" }]
          ]
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 10]
      });
  }
  return t.client_notes && (E.push({ text: "客户备注", style: "sectionHeader", margin: [0, 10, 0, 5] }), E.push({
    text: t.client_notes,
    style: "value",
    margin: [0, 0, 0, 10]
  })), c && (t.internal_notes && (E.push({ text: "内部备注（仅内部可见）", style: "sectionHeaderInternal", margin: [0, 10, 0, 5] }), E.push({
    text: t.internal_notes,
    style: "value",
    margin: [0, 0, 0, 10]
  })), (t.client_allergies || t.client_contraindications || t.client_is_sensitive_skin) && (E.push({ text: "禁忌与注意事项（仅内部可见）", style: "sectionHeaderInternal", margin: [0, 10, 0, 5] }), t.client_allergies && E.push({ text: `过敏史：${t.client_allergies}`, style: "warningText", margin: [0, 0, 0, 5] }), t.client_contraindications && E.push({ text: `禁忌症：${t.client_contraindications}`, style: "warningText", margin: [0, 0, 0, 5] }), t.client_is_sensitive_skin && E.push({ text: "敏感肌肤：是", style: "warningText", margin: [0, 0, 0, 5] }), (t.is_sensitive_area || t.body_part_is_sensitive) && E.push({ text: "敏感部位：需准备遮挡措施", style: "warningText", margin: [0, 0, 0, 5] }))), E.push({
    text: "客户确认签字：__________________",
    style: "value",
    margin: [0, 30, 0, 10]
  }), E.push({
    text: `生成时间：${L().format("YYYY-MM-DD HH:mm:ss")}`,
    style: "footer",
    alignment: "right",
    margin: [0, 20, 0, 0]
  }), {
    content: E,
    defaultStyle: {
      font: _,
      fontSize: 10
    },
    styles: {
      header: {
        fontSize: 20,
        bold: !0,
        color: "#121212"
      },
      subheader: {
        fontSize: 10,
        color: "#666"
      },
      sectionHeader: {
        fontSize: 14,
        bold: !0,
        color: "#121212"
      },
      sectionHeaderInternal: {
        fontSize: 14,
        bold: !0,
        color: "#C53030"
      },
      label: {
        fontSize: 10,
        color: "#666",
        fillColor: "#f5f5f5",
        margin: [5, 5, 0, 5]
      },
      value: {
        fontSize: 10,
        margin: [5, 5, 0, 5]
      },
      valueConfirmed: {
        fontSize: 10,
        color: "#2D4A3E",
        margin: [5, 5, 0, 5]
      },
      warningText: {
        fontSize: 10,
        color: "#C53030"
      },
      footer: {
        fontSize: 9,
        color: "#999"
      }
    }
  };
}
function ne(t) {
  return {
    confirmed: "已确认",
    pending_deposit: "待付定金",
    cancelled: "已取消",
    completed: "已完成"
  }[t] || t;
}
function ie() {
  p.handle("clients:list", (t, e) => At(e)), p.handle("clients:get", (t, e) => it(e)), p.handle("clients:save", (t, e) => Lt(e)), p.handle("clients:delete", (t, e) => $t(e)), p.handle("artists:list", (t, e = !0) => Mt(e)), p.handle("artists:save", (t, e) => wt(e)), p.handle("bodyParts:list", () => Ft()), p.handle("bookings:list", (t, e) => st(e)), p.handle("bookings:get", (t, e) => Q(e)), p.handle("bookings:checkConflict", (t, e, n, i, _) => ft(e, n, i, _)), p.handle("bookings:save", (t, e) => Ht(e)), p.handle("bookings:cancel", (t, e) => Pt(e)), p.handle("bookings:today", (t, e) => gt(e)), p.handle("designs:list", (t, e) => ht(e)), p.handle("designs:get", (t, e) => Z(e)), p.handle("designs:save", (t, e) => Xt(e)), p.handle("designs:delete", (t, e) => Bt(e)), p.handle("designs:checkImages", () => vt()), p.handle("designs:uploadImage", async (t, e, n) => Yt(e, n)), p.handle("deposits:uploadImage", async (t, e, n) => Wt(e, n)), p.handle("deposits:list", (t, e) => yt(e)), p.handle("deposits:save", (t, e) => Gt(e)), p.handle("alerts:generate", () => jt()), p.handle("export:confirmation", async (t, e, n) => {
    const i = await j.showSaveDialog({
      title: "导出确认单",
      defaultPath: `预约确认单_${e}_${n === "client" ? "客户版" : "内部版"}.pdf`,
      filters: [{ name: "PDF文件", extensions: ["pdf"] }]
    });
    return i.canceled || !i.filePath ? { success: !1, filePath: null } : te(e, n, i.filePath);
  }), p.handle("dialog:openFile", async (t, e) => {
    const n = await j.showOpenDialog({
      properties: ["openFile"],
      filters: e || [{ name: "图片文件", extensions: ["jpg", "jpeg", "png", "gif", "webp"] }]
    });
    return n.canceled ? null : n.filePaths[0];
  }), p.handle("dialog:openDirectory", async () => {
    const t = await j.showOpenDialog({
      properties: ["openDirectory"]
    });
    return t.canceled ? null : t.filePaths[0];
  }), p.handle("fs:fileExists", (t, e) => y.existsSync(e)), p.handle("fs:readFile", (t, e) => y.readFileSync(e, "base64")), p.handle("app:getDbPath", () => K()), p.handle("app:backupDb", async () => {
    const t = K(), e = await j.showSaveDialog({
      title: "备份数据库",
      defaultPath: `tattoo-studio-backup-${Date.now()}.db`,
      filters: [{ name: "数据库文件", extensions: ["db"] }]
    });
    return e.canceled || !e.filePath ? { success: !1, filePath: null } : (y.copyFileSync(t, e.filePath), { success: !0, filePath: e.filePath });
  }), p.handle("app:restoreDb", async () => {
    const t = await j.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "数据库文件", extensions: ["db"] }]
    });
    if (t.canceled) return { success: !1 };
    const e = K(), n = I.join(I.dirname(e), `backup-${Date.now()}.db`);
    return y.copyFileSync(e, n), y.copyFileSync(t.filePaths[0], e), { success: !0, backupPath: n };
  });
}
let A = null;
const se = process.env.NODE_ENV === "development" || !F.isPackaged;
function _t() {
  A = new Et({
    width: 1600,
    height: 900,
    minWidth: 1280,
    minHeight: 800,
    title: "纹身预约图案柜",
    backgroundColor: "#121212",
    webPreferences: {
      preload: I.join(__dirname, "preload.js"),
      contextIsolation: !0,
      nodeIntegration: !1,
      webSecurity: !0
    },
    icon: I.join(process.cwd(), "public/favicon.svg")
  }), se ? (A.loadURL("http://localhost:5173"), A.webContents.openDevTools()) : A.loadFile(I.join(__dirname, "../dist/index.html")), A.on("closed", () => {
    A = null;
  });
}
F.whenReady().then(() => {
  mt(), ie(), _t(), F.on("activate", () => {
    Et.getAllWindows().length === 0 && _t();
  });
});
F.on("window-all-closed", () => {
  process.platform !== "darwin" && F.quit();
});
F.on("second-instance", () => {
  A && (A.isMinimized() && A.restore(), A.focus());
});
const ae = F.requestSingleInstanceLock();
ae ? F.on("second-instance", () => {
  A && (A.isMinimized() && A.restore(), A.focus());
}) : F.quit();
