# /privacy — DRAFT for review (not published)

Status: draft wording, 2026-10-01. Becomes the `/privacy` page (TH default, EN) after the owner approves it. Statements below describe what the code does today; nothing here claims compliance with a specific law. `[…]` = the owner fills in.

---

## ภาษาไทย

### นโยบายความเป็นส่วนตัวของ JaoPor

ปรับปรุงล่าสุด: [วันที่เผยแพร่]

JaoPor (jaopor.vercel.app) เป็นเว็บรวมผลงานที่คนไทยสร้างด้วย AI พร้อมตัวเลขที่ยืนยันจากระบบต้นทาง หน้านี้อธิบายว่าเราเก็บข้อมูลอะไร เพื่ออะไร เก็บนานแค่ไหน และคุณควบคุมอะไรได้บ้าง

ติดต่อเรื่องข้อมูลส่วนบุคคล: [อีเมลติดต่อ]

#### 1. บัญชีผู้ใช้

- เข้าสู่ระบบด้วย Google หรือ GitHub เราได้รับชื่อ อีเมล และรูปโปรไฟล์จากผู้ให้บริการนั้น ใช้เพื่อสร้างบัญชีและแสดงชื่อ/รูปของคุณบนผลงานและโปรไฟล์
- เราไม่เห็นและไม่เก็บรหัสผ่านของ Google หรือ GitHub
- ข้อมูลบัญชีเก็บในฐานข้อมูล Supabase (ภูมิภาค Singapore)

#### 2. ข้อมูลผลงานและโปรไฟล์ที่คุณกรอก

- ข้อมูลผลงาน (ชื่อ คำอธิบาย ลิงก์ ภาพหน้าจอ ฯลฯ) แสดงต่อสาธารณะเมื่อคุณเผยแพร่
- โปรไฟล์ผู้สร้าง: คุณเลือกได้ว่าแต่ละช่อง (เช่น จังหวัด ลิงก์โซเชียล ประสบการณ์ ทักษะ) แสดงต่อทุกคน เฉพาะสมาชิกที่เข้าสู่ระบบ หรือซ่อน และเลือกไม่แสดงในรายชื่อผู้สร้างได้
- LINE ID และอีเมลติดต่อที่คุณใส่ จะแสดงเฉพาะกับคนที่คุณกด “ยอมรับ” คำขอคุยเท่านั้น

#### 3. ตัวเลขที่ยืนยัน (รายได้ ผู้เข้าชม ผลงานบน GitHub)

- คีย์ API ที่คุณเชื่อมต่อ (เช่น Stripe) ต้องเป็นคีย์แบบอ่านอย่างเดียว เราเข้ารหัสก่อนเก็บ และถอดรหัสเฉพาะในเซิร์ฟเวอร์ตอนดึงตัวเลข
- เราเก็บเฉพาะตัวเลขรวม (เช่น รายได้ 30 วัน MRR จำนวนผู้เข้าชม) ไม่เก็บข้อมูลลูกค้าของคุณ

#### 4. ตัวนับผู้เข้าชมของ JaoPor (โค้ดที่ผู้ก่อตั้งติดบนเว็บของตัวเอง)

- เมื่อมีคนเปิดเว็บที่ติดโค้ดนี้ เบราว์เซอร์ส่งสัญญาณหนึ่งครั้งต่อการเปิดหน้า ไม่มีคุกกี้
- เซิร์ฟเวอร์คำนวณค่าแฮช (HMAC) จาก IP และ User-Agent ด้วยกุญแจที่เปลี่ยนทุกวัน เพื่อนับผู้เข้าชมไม่ซ้ำต่อวัน ไม่เก็บ IP
- ค่าแฮชของวันก่อน ๆ ถูกลบหลังสรุปเป็นยอดรายวัน เหลือเพียงตัวเลขจำนวนผู้เข้าชมต่อวัน

#### 5. “ตอนนี้มีคนดูอยู่” (แผนที่ผู้เข้าชมแบบเรียลไทม์)

ส่วนนี้แสดงว่าตอนนี้มีกี่คนเปิด JaoPor อยู่ แบบไม่ระบุตัวตน

- **ตัวตนนิรนาม:** เบราว์เซอร์ของคุณสุ่มรหัส (ID) หนึ่งชุดเก็บไว้ในเครื่อง (localStorage) และได้ชื่อสมมติจากรายการคำที่เรากำหนดไว้ (เช่น “ช้างสีฟ้า”) กับรูปการ์ตูนที่สร้างจากรหัสนั้น ไม่เชื่อมกับบัญชีของคุณ
- **ตำแหน่งโดยประมาณ:** ผู้ให้บริการโฮสต์ (Vercel) ประมาณตำแหน่งจาก IP ของคุณ เราใช้เพียงประเทศ จังหวัดที่ใกล้ที่สุด (ถ้าอยู่ในไทย) และพิกัดที่ปัดเหลือราว 11 กม. บวกค่าสุ่มเล็กน้อย IP ของคุณไม่ถูกเก็บและไม่ถูกส่งให้ผู้เข้าชมคนอื่น
- **สิ่งที่ผู้เข้าชมคนอื่นเห็นขณะคุณออนไลน์:** ชื่อสมมติและรูปการ์ตูน ประเภทหน้าที่เปิด (เช่น “หน้าผลงาน”) ประเภทอุปกรณ์ (มือถือ/คอมพิวเตอร์) ประเทศหรือจังหวัด และพิกัดโดยประมาณบนแผนที่โลก
- **การเชื่อมต่อ:** เกิดขึ้นเฉพาะตอนแท็บ JaoPor เปิดอยู่บนหน้าจอ และตัดเมื่อคุณสลับไปแท็บอื่น ผ่านบริการ Realtime ของ Supabase ข้อมูลส่วนนี้ไม่ถูกบันทึกถาวร หายไปเมื่อคุณออก
- **สัญญาณสำรอง:** ระหว่างเปิดหน้าเว็บ เบราว์เซอร์ส่งสัญญาณประมาณนาทีละครั้ง เพื่อให้นับจำนวนได้แม้ระบบเรียลไทม์มีปัญหา เราเก็บ: ค่าแฮชของรหัสนิรนาม (กุญแจเปลี่ยนทุกวัน) ที่อยู่หน้า ประเทศ/จังหวัด ประเภทอุปกรณ์ และเวลาล่าสุด ระบบลบข้อมูลที่เก่ากว่า 10 นาทีอัตโนมัติ
- **ไม่ร่วมแสดงตัว:** กด “ไม่แสดงตัวฉัน” ใต้แผนที่ เบราว์เซอร์นี้จะหยุดส่งข้อมูลทั้งสองแบบ (ยังดูแผนที่ได้) กดปุ่ม × เพื่อซ่อนส่วนนี้จากหน้าแรก
- **แผนที่โลก:** เมื่อคุณกด “ทั่วโลก” เบราว์เซอร์ของคุณโหลดภาพแผนที่จาก OpenFreeMap โดยตรง ซึ่งผู้ให้บริการนั้นจะเห็น IP ของคุณตามปกติของการโหลดเว็บ

#### 6. ข้อมูลที่เก็บในเบราว์เซอร์ของคุณ

เราไม่ใช้คุกกี้โฆษณาหรือคุกกี้ติดตามข้ามเว็บ ที่เก็บในเครื่องคุณมี: คุกกี้เข้าสู่ระบบ (เฉพาะผู้ที่ล็อกอิน) ธีม สกุลเงิน จังหวัดที่คุณเลือกในโอลิมปิก รหัสนิรนามของแผนที่สด และการตั้งค่าซ่อน/ไม่แสดงตัว ลบได้จากการตั้งค่าเบราว์เซอร์

#### 7. บริการภายนอกที่เราใช้

Vercel (โฮสต์เว็บ), Supabase (ฐานข้อมูล การเข้าสู่ระบบ และระบบเรียลไทม์), Google และ GitHub (เข้าสู่ระบบ), OpenFreeMap (ภาพแผนที่โลก เมื่อคุณเปิดเท่านั้น), Google Gemini (เมื่อเจ้าของผลงานกด “ช่วยเติมจากเว็บไซต์” ระบบส่งข้อความสาธารณะจากเว็บไซต์ของผลงานนั้นไปสรุป), Frankfurter (อัตราแลกเปลี่ยน ฝั่งเซิร์ฟเวอร์ ไม่มีข้อมูลผู้ใช้)

#### 8. การลบข้อมูล

- ลบผลงานได้เองจากแดชบอร์ด
- ขอลบบัญชี: ติดต่อ [อีเมลติดต่อ] เมื่อลบบัญชี ระบบจะลบโปรไฟล์ ทักษะ ประสบการณ์ การติดตาม คำขอคุย และสถานะสมาชิกในผลงานของคุณ (ปุ่มลบบัญชีด้วยตัวเองกำลังพัฒนา)

#### 9. การเปลี่ยนแปลงนโยบาย

เมื่อเราเปลี่ยนวิธีเก็บหรือใช้ข้อมูล เราจะแก้ไขหน้านี้และวันที่ด้านบน

---

## English

### JaoPor privacy policy

Last updated: [publish date]

JaoPor (jaopor.vercel.app) is a directory of things people build with AI, with numbers verified at the source. This page explains what we collect, why, how long we keep it, and what you control.

Privacy contact: [contact email]

#### 1. Accounts

- You sign in with Google or GitHub. We receive your name, email and profile picture from that provider and use them to create your account and show your name/picture on your projects and profile.
- We never see or store your Google or GitHub password.
- Account data is stored in a Supabase database (Singapore region).

#### 2. Project and profile information you enter

- Project details (name, description, links, screenshots, etc.) are public once you publish.
- Builder profiles: you choose per field (e.g. province, social links, experience, skills) whether it's shown to everyone, signed-in members only, or hidden, and you can leave the builders directory.
- The LINE ID and contact email you add are shown only to people whose contact request you accept.

#### 3. Verified numbers (revenue, visitors, GitHub activity)

- API keys you connect (e.g. Stripe) must be read-only. We encrypt them before storing and decrypt them only on our server when fetching numbers.
- We store aggregate numbers only (e.g. 30-day revenue, MRR, visitor counts), never your customers' data.

#### 4. The JaoPor visitor counter (the snippet founders add to their own sites)

- Each page view on a site using the snippet sends one beacon. No cookies.
- Our server computes a keyed hash (HMAC) of the IP address and user agent with a key that changes daily, to count unique visitors per day. The IP address is not stored.
- Hashes from previous days are deleted once they are rolled up into a daily total; only the daily visitor count remains.

#### 5. "Who's here right now" (the live visitor map)

This section shows, anonymously, how many people have JaoPor open.

- **Anonymous identity:** your browser generates a random ID stored on your device (localStorage), a made-up name from a fixed word list we control (e.g. "Blue Elephant") and a cartoon avatar drawn from that ID. It is not linked to your account.
- **Approximate location:** our host (Vercel) estimates location from your IP address. We use only the country, the nearest province (in Thailand), and coordinates rounded to about 11 km plus a small random offset. Your IP address is not stored and is never shared with other visitors.
- **What other visitors see while you're online:** your made-up name and avatar, the type of page you're on (e.g. "a project page"), device type (mobile/desktop), country or province, and the approximate point on the world map.
- **Connection:** only while a JaoPor tab is visible on your screen; it disconnects when you switch tabs. This runs on Supabase Realtime and is not stored permanently — it disappears when you leave.
- **Backup heartbeat:** while a page is open, your browser sends a signal about once a minute so the count works even if the live connection fails. We store: a hash of your anonymous ID (daily-changing key), the page path, country/province, device type and last-seen time. Entries older than 10 minutes are deleted automatically.
- **Opting out:** press "Don't show me" under the map; this browser then stops sending both (you can still watch). Press × to hide the section from the home page.
- **World map:** when you press "World", your browser loads map images directly from OpenFreeMap, which, like any website you load, sees your IP address.

#### 6. What's stored in your browser

No advertising or cross-site tracking cookies. Stored on your device: the sign-in cookie (signed-in users only), theme, currency, the province you picked in the Olympics, the live map's anonymous ID, and your hide/opt-out choices. You can clear them in your browser settings.

#### 7. Services we use

Vercel (hosting), Supabase (database, sign-in, realtime), Google and GitHub (sign-in), OpenFreeMap (world map images, only when you open it), Google Gemini (when a project owner presses "Fill from website", public text from that project's website is sent for a summary), Frankfurter (exchange rates, server-side, no user data).

#### 8. Deleting your data

- Delete a project yourself from the dashboard.
- To delete your account, contact [contact email]. Deleting an account removes your profile, skills, experience, follows, contact requests and project memberships. (A self-service delete button is being built.)

#### 9. Changes

When we change how we collect or use data, we update this page and the date above.
