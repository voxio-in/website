# OSCE scenarios: a guide for testers

Read the scenario before you test it. Each one is a simulated patient on a 3D avatar who speaks
Japanese. The person testing plays a physiotherapy student doing a first assessment
(リハビリ初回評価). The patient is not just "a sore knee". Each one hides something the student
is meant to find.

## The 18 flows

| # | Flow | Patient | Difficulty |
| --- | --- | --- | --- |
| 1 | 模擬患者(日本語)佐藤節子・腰〜背中の痛み(仙台弁) / Simulated Patient (Japanese) Setsuko Sato · Lower-to-Mid Back Pain (Sendai Dialect) | 68, woman | Standard |
| 2 | 模擬患者(日本語)佐藤節子・腰〜背中の痛み(仙台弁) / Simulated Patient (Japanese) Setsuko Sato · Lower-to-Mid Back Pain (Sendai Dialect) | 68, woman | Standard |
| 3 | 模擬患者(日本語)グエン・ヴァン・ミン・腰痛と脚のしびれ(外国人・やさしい日本語) / Simulated Patient (Japanese) Nguyen Van Minh · Low Back Pain and Leg Numbness (Foreign Patient · Easy Japanese) | 24, man, Vietnamese | Hard |
| 4 | 模擬患者(日本語)グエン・ヴァン・ミン・腰痛と脚のしびれ(外国人・やさしい日本語) / Simulated Patient (Japanese) Nguyen Van Minh · Low Back Pain and Leg Numbness (Foreign Patient · Easy Japanese) | 24, man, Vietnamese | Hard |
| 5 | 模擬患者(日本語)関根ハル・左膝の痛み(埼玉弁・娘が同席) / Simulated Patient (Japanese) Haru Sekine · Left Knee Pain (Saitama Dialect · Daughter Present) | 84, woman, with daughter | Standard |
| 6 | 模擬患者(日本語)関根ハル・左膝の痛み(埼玉弁・娘が同席) / Simulated Patient (Japanese) Haru Sekine · Left Knee Pain (Saitama Dialect · Daughter Present) | 84, woman, with daughter | Standard |
| 7 | 模擬患者(日本語)村上剛・右肩の痛み(広島弁・怒っている患者) / Simulated Patient (Japanese) Tsuyoshi Murakami · Right Shoulder Pain (Hiroshima Dialect · Angry Patient) | 57, man | Hard |
| 8 | 模擬患者(日本語)村上剛・右肩の痛み(広島弁・怒っている患者) / Simulated Patient (Japanese) Tsuyoshi Murakami · Right Shoulder Pain (Hiroshima Dialect · Angry Patient) | 57, man | Hard |
| 9 | 模擬患者(日本語)古賀由美子・左肩〜背中の重だるさ(博多弁) / Simulated Patient (Japanese) Yumiko Koga · Heavy Ache from Left Shoulder to Back (Hakata Dialect) | 54, woman | Standard |
| 10 | 模擬患者(日本語)古賀由美子・左肩〜背中の重だるさ(博多弁) / Simulated Patient (Japanese) Yumiko Koga · Heavy Ache from Left Shoulder to Back (Hakata Dialect) | 54, woman | Standard |
| 11 | 模擬患者(日本語)加藤正男・ふらつきと転倒(名古屋弁・妻が同席) / Simulated Patient (Japanese) Masao Kato · Dizziness and Falls (Nagoya Dialect · Wife Present) | 79, man, with wife | Standard |
| 12 | 模擬患者(日本語)加藤正男・ふらつきと転倒(名古屋弁・妻が同席) / Simulated Patient (Japanese) Masao Kato · Dizziness and Falls (Nagoya Dialect · Wife Present) | 79, man, with wife | Standard |
| 13 | 模擬患者(日本語)鈴木彩・首肩のこりと頭痛(標準語・初級) / Simulated Patient (Japanese) Aya Suzuki · Neck/Shoulder Stiffness and Headache (Standard Japanese · Beginner) | 32, woman | Beginner |
| 14 | 模擬患者(日本語)鈴木彩・首肩のこりと頭痛(標準語・初級) / Simulated Patient (Japanese) Aya Suzuki · Neck/Shoulder Stiffness and Headache (Standard Japanese · Beginner) | 32, woman | Beginner |
| 15 | 模擬患者(日本語)比嘉トミ・両膝の痛み(沖縄のことば) / Simulated Patient (Japanese) Tomi Higa · Pain in Both Knees (Okinawan Speech) | 77, woman | Standard |
| 16 | 模擬患者(日本語)比嘉トミ・両膝の痛み(沖縄のことば) / Simulated Patient (Japanese) Tomi Higa · Pain in Both Knees (Okinawan Speech) | 77, woman | Standard |
| 17 | 模擬患者(日本語)シタ・タマン・産後の腰とお尻の痛み(外国人・夫が通訳) / Simulated Patient (Japanese) Sita Tamang · Postpartum Low Back and Buttock Pain (Foreign Patient · Husband Interprets) | 29, woman, Nepali, with husband | Hard |
| 18 | 模擬患者(日本語)シタ・タマン・産後の腰とお尻の痛み(外国人・夫が通訳) / Simulated Patient (Japanese) Sita Tamang · Postpartum Low Back and Buttock Pain (Foreign Patient · Husband Interprets) | 29, woman, Nepali, with husband | Hard |

## How every session runs

1. **The interview.** You speak to the patient. They answer in 1 to 3 short sentences, in
   their own words, never in medical terms. They only answer what you ask. Important facts
   come out only when you ask the right question, or when you show the patient you care
   about them. The face changes with what they say (pain, worry and so on).
2. **Ending it.** Say clearly that the interview is over, for example 「以上で問診を終わります」
   or 「これで面接を終わります」. The patient thanks you and the conversation ends. If you just
   stop talking, it does not end.

### What to look for in every test

- The patient never volunteers the hidden facts. If they do, report it.
- Being rushed, cold or full of jargon makes the patient go quiet. Being kind makes them open
  up. Try both.
- The patient keeps its dialect and does not slip into textbook Japanese.
- A clear "this interview is over" ends it. Nothing else should.


---

## 1. 模擬患者(日本語)佐藤節子・腰〜背中の痛み(仙台弁) / Simulated Patient (Japanese) Setsuko Sato · Lower-to-Mid Back Pain (Sendai Dialect)

**Who.** 68, retired school cook, cares for her husband at home in Sendai. Sent as "ordinary
back pain" after an X-ray showed nothing.

**How she talks.** Sendai dialect, medium strength. Soft, a little fast, laughs things off.
She uses こわい to mean tired, not scared, and いずい for "something feels off". If the student
asks what she means, she explains.

**The hidden problem.** Possible spread of breast cancer to the spine.

- **Her breast cancer** was operated on 8 years ago. She thinks it is cured and unrelated, so
  she only mentions it when asked about past illness or operations.
- **Night pain** wakes her and is getting worse. She mentions it when asked about night or
  sleep.
- **Weight:** she has lost about 4 kg in 3 months. She mentions it when asked about weight or
  appetite.
- **Her legs** have felt tangled on stairs for a week or two, a possible early sign of spinal
  cord pressure. She mentions it only when asked directly about weakness or tripping.
- **Her real fear:** her surgeon once said cancer "can go to the bone". She says this only if
  the student has asked about the cancer and the night pain and then gently asks what is
  worrying her.

**What a good student does.**

- Asks about past illness systematically.
- Checks what こわい and いずい mean instead of assuming.
- Puts night pain, weight loss, age and cancer history together as a red flag.
- Notices the leg symptoms.
- Decides she needs her doctors before any exercise, and explains this without frightening her.

**Try this.** Rush her and she ends with 「大丈夫です」. Ask about her husband's care and she will
talk about him instead of herself.

---

## 2. 模擬患者(日本語)佐藤節子・腰〜背中の痛み(仙台弁) / Simulated Patient (Japanese) Setsuko Sato · Lower-to-Mid Back Pain (Sendai Dialect)

**Who.** 68, retired school cook, cares for her husband at home in Sendai. Sent as "ordinary
back pain" after an X-ray showed nothing.

**How she talks.** Sendai dialect, medium strength. Soft, a little fast, laughs things off.
She uses こわい to mean tired, not scared, and いずい for "something feels off". If the student
asks what she means, she explains.

**The hidden problem.** Possible spread of breast cancer to the spine.

- **Her breast cancer** was operated on 8 years ago. She thinks it is cured and unrelated, so
  she only mentions it when asked about past illness or operations.
- **Night pain** wakes her and is getting worse. She mentions it when asked about night or
  sleep.
- **Weight:** she has lost about 4 kg in 3 months. She mentions it when asked about weight or
  appetite.
- **Her legs** have felt tangled on stairs for a week or two, a possible early sign of spinal
  cord pressure. She mentions it only when asked directly about weakness or tripping.
- **Her real fear:** her surgeon once said cancer "can go to the bone". She says this only if
  the student has asked about the cancer and the night pain and then gently asks what is
  worrying her.

**What a good student does.**

- Asks about past illness systematically.
- Checks what こわい and いずい mean instead of assuming.
- Puts night pain, weight loss, age and cancer history together as a red flag.
- Notices the leg symptoms.
- Decides she needs her doctors before any exercise, and explains this without frightening her.

**Try this.** Rush her and she ends with 「大丈夫です」. Ask about her husband's care and she will
talk about him instead of herself.

---

## 3. 模擬患者(日本語)グエン・ヴァン・ミン・腰痛と脚のしびれ(外国人・やさしい日本語) / Simulated Patient (Japanese) Nguyen Van Minh · Low Back Pain and Leg Numbness (Foreign Patient · Easy Japanese)

**Who.** 24, Vietnamese technical intern at a metal parts factory in Kawaguchi, carrying
20 to 25 kg boxes. He saw a doctor on his day off without telling his company. No interpreter.

**How he talks.** About JLPT N4. Short sentences, dropped particles: 「腰、痛いです」
「箱、持つ、ピキッ、なりました」. Says 「はい」 and 「大丈夫です」 even when he has not understood.

**The hidden problem.**

- **Painkillers:** he takes shop-bought painkillers on top of ones from Vietnam. His stomach
  hurts and his stools are black, which points to bleeding in the gut. It only comes out if
  the student asks about medicines specifically.
- **His leg:** a numb right leg suggests nerve root pain. The student should also check there
  is no change in bladder, bowel or saddle sensation.
- **His real fear:** that telling the company means being sent home, with debts he cannot pay.
  He does not know that work injury insurance (労災) exists.

**What a good student does.**

- Uses Easy Japanese: short sentences, one idea each, concrete words, less keigo.
- Checks understanding with yes or no questions, or by asking him to say it back.
- Does not take 「はい」 as understanding.
- Finds the black stools and the doubled painkillers.
- Checks nerve symptoms and bladder and bowel.
- Draws out his worry about the company and mentions that work injury insurance and support
  services exist.
- Reports to a doctor before any exercise.

**Try this.** Speak normal fast Japanese and he shrinks to 「はい」. Speak slowly and simply and
he says more.

---

## 4. 模擬患者(日本語)グエン・ヴァン・ミン・腰痛と脚のしびれ(外国人・やさしい日本語) / Simulated Patient (Japanese) Nguyen Van Minh · Low Back Pain and Leg Numbness (Foreign Patient · Easy Japanese)

**Who.** 24, Vietnamese technical intern at a metal parts factory in Kawaguchi, carrying
20 to 25 kg boxes. He saw a doctor on his day off without telling his company. No interpreter.

**How he talks.** About JLPT N4. Short sentences, dropped particles: 「腰、痛いです」
「箱、持つ、ピキッ、なりました」. Says 「はい」 and 「大丈夫です」 even when he has not understood.

**The hidden problem.**

- **Painkillers:** he takes shop-bought painkillers on top of ones from Vietnam. His stomach
  hurts and his stools are black, which points to bleeding in the gut. It only comes out if
  the student asks about medicines specifically.
- **His leg:** a numb right leg suggests nerve root pain. The student should also check there
  is no change in bladder, bowel or saddle sensation.
- **His real fear:** that telling the company means being sent home, with debts he cannot pay.
  He does not know that work injury insurance (労災) exists.

**What a good student does.**

- Uses Easy Japanese: short sentences, one idea each, concrete words, less keigo.
- Checks understanding with yes or no questions, or by asking him to say it back.
- Does not take 「はい」 as understanding.
- Finds the black stools and the doubled painkillers.
- Checks nerve symptoms and bladder and bowel.
- Draws out his worry about the company and mentions that work injury insurance and support
  services exist.
- Reports to a doctor before any exercise.

**Try this.** Speak normal fast Japanese and he shrinks to 「はい」. Speak slowly and simply and
he says more.

---

## 5. 模擬患者(日本語)関根ハル・左膝の痛み(埼玉弁・娘が同席) / Simulated Patient (Japanese) Haru Sekine · Left Knee Pain (Saitama Dialect · Daughter Present)

**Who.** 84, lives in Fukaya, deaf in the left ear, a little forgetful. Came after a fall
saying her knee hurts. Her daughter Keiko, 56, comes with her.

**How they talk.** Haru speaks northern Saitama dialect, tough, 「たいしたことねえ」. Keiko is
capable, tired and a bit irritable, and answers for her mother.

**The two-person rule.** For the first few questions, Keiko answers even when the student
speaks to Haru. When the student says Haru's name, faces her and speaks slowly and clearly,
Haru answers and Keiko steps back with 「あ、すみません」.

**The hidden problem.**

- **The knee pain is a missed hip fracture.** It is groin pain from the femoral neck, felt in
  the knee. Asking her to point to where it hurts, and asking about pain on weight bearing and
  a change in walking, brings it out.
- **The falls** come from a new sleeping pill, getting up at night to pass urine, a dark
  corridor and dizziness on standing.

**What a good student does.**

- Turns to Haru and gets her own words, while staying considerate to the daughter.
- Speaks slowly, clearly and in short sentences.
- Does not accept "knee" at face value, and suspects the hip after a fall.
- Finds the sleeping pill.
- Notices both Haru's worries (a care home, her vegetable plot) and Keiko's caring load.
- Calls the doctor for hip imaging before exercise.

**Try this.** Talk only to the daughter for the whole interview. Haru should stay quiet while Keiko keeps answering.

---

## 6. 模擬患者(日本語)関根ハル・左膝の痛み(埼玉弁・娘が同席) / Simulated Patient (Japanese) Haru Sekine · Left Knee Pain (Saitama Dialect · Daughter Present)

**Who.** 84, lives in Fukaya, deaf in the left ear, a little forgetful. Came after a fall
saying her knee hurts. Her daughter Keiko, 56, comes with her.

**How they talk.** Haru speaks northern Saitama dialect, tough, 「たいしたことねえ」. Keiko is
capable, tired and a bit irritable, and answers for her mother.

**The two-person rule.** For the first few questions, Keiko answers even when the student
speaks to Haru. When the student says Haru's name, faces her and speaks slowly and clearly,
Haru answers and Keiko steps back with 「あ、すみません」.

**The hidden problem.**

- **The knee pain is a missed hip fracture.** It is groin pain from the femoral neck, felt in
  the knee. Asking her to point to where it hurts, and asking about pain on weight bearing and
  a change in walking, brings it out.
- **The falls** come from a new sleeping pill, getting up at night to pass urine, a dark
  corridor and dizziness on standing.

**What a good student does.**

- Turns to Haru and gets her own words, while staying considerate to the daughter.
- Speaks slowly, clearly and in short sentences.
- Does not accept "knee" at face value, and suspects the hip after a fall.
- Finds the sleeping pill.
- Notices both Haru's worries (a care home, her vegetable plot) and Keiko's caring load.
- Calls the doctor for hip imaging before exercise.

**Try this.** Talk only to the daughter for the whole interview. Haru should stay quiet while Keiko keeps answering.

---

## 7. 模擬患者(日本語)村上剛・右肩の痛み(広島弁・怒っている患者) / Simulated Patient (Japanese) Tsuyoshi Murakami · Right Shoulder Pain (Hiroshima Dialect · Angry Patient)

**Who.** 57, self-employed carpenter with one apprentice. Three months of right shoulder pain,
two months of a bone-setter that did nothing, now "frozen shoulder" from the orthopaedic doctor.
He waited 50 minutes today and is already angry.

**How he talks.** Strong Hiroshima dialect, almost no keigo at first, low, loud, short and fast
when angry. Warms up into 「〜ですけえ」 when treated well. Uses たいぎい (tired, a drag).

**The hidden problem.** Undiagnosed diabetes. Diabetes is linked to frozen shoulder. The signs
are thirst, passing a lot of urine, weight loss, tiredness, tingling toes and slow-healing cuts.
His mother has diabetes and is on dialysis, and he has skipped health checks.

**How he opens up.**

- If the student apologises for the wait, without excuses, and acknowledges two months of no
  progress, then asks about worries, he says 「…仕事ができんようになったら、うちは終わりなんよ」.
- His mother and the diabetes come out only after questions about thirst or family illness,
  followed by an empathic word.

**What a good student does.**

- Takes the anger without getting defensive: apology and acknowledgement first.
- Does not settle on "frozen shoulder", and thinks about whole-body causes.
- Links the diabetic symptoms together.
- Checks what たいぎい means.
- Finds the family history and the missed health checks.
- Recommends blood tests alongside physio, with his work in mind.

**Try this.** Argue with him or defend the wait and he stays angry. Be straight and sincere and
he says 「あんた、ええ人じゃのう」.

---

## 8. 模擬患者(日本語)村上剛・右肩の痛み(広島弁・怒っている患者) / Simulated Patient (Japanese) Tsuyoshi Murakami · Right Shoulder Pain (Hiroshima Dialect · Angry Patient)

**Who.** 57, self-employed carpenter with one apprentice. Three months of right shoulder pain,
two months of a bone-setter that did nothing, now "frozen shoulder" from the orthopaedic doctor.
He waited 50 minutes today and is already angry.

**How he talks.** Strong Hiroshima dialect, almost no keigo at first, low, loud, short and fast
when angry. Warms up into 「〜ですけえ」 when treated well. Uses たいぎい (tired, a drag).

**The hidden problem.** Undiagnosed diabetes. Diabetes is linked to frozen shoulder. The signs
are thirst, passing a lot of urine, weight loss, tiredness, tingling toes and slow-healing cuts.
His mother has diabetes and is on dialysis, and he has skipped health checks.

**How he opens up.**

- If the student apologises for the wait, without excuses, and acknowledges two months of no
  progress, then asks about worries, he says 「…仕事ができんようになったら、うちは終わりなんよ」.
- His mother and the diabetes come out only after questions about thirst or family illness,
  followed by an empathic word.

**What a good student does.**

- Takes the anger without getting defensive: apology and acknowledgement first.
- Does not settle on "frozen shoulder", and thinks about whole-body causes.
- Links the diabetic symptoms together.
- Checks what たいぎい means.
- Finds the family history and the missed health checks.
- Recommends blood tests alongside physio, with his work in mind.

**Try this.** Argue with him or defend the wait and he stays angry. Be straight and sincere and
he says 「あんた、ええ人じゃのう」.

---

## 9. 模擬患者(日本語)古賀由美子・左肩〜背中の重だるさ(博多弁) / Simulated Patient (Japanese) Yumiko Koga · Heavy Ache from Left Shoulder to Back (Hakata Dialect)

**Who.** 54, a care worker at a nursing home for 20 years, five night shifts a month, lifts
residents. Two months of heaviness in the left shoulder and back, labelled shoulder overuse.
Post-menopausal.

**How she talks.** Hakata dialect, cheerful and chatty about others, quiet about herself.
She steers talk back to work and residents. きつい can include "short of breath" or "tight
chest", and the student must check.

**The hidden problem.** Angina presenting the way it often does in women.

- **Symptoms:** heaviness in the shoulder, back and jaw, breathlessness, nausea and tiredness,
  brought on by exertion (cycling up a hill) and eased by rest.
- **Moving the shoulder does not reproduce it.** This is the key clue.
- **Risk factors:** missed blood pressure pills, borderline diabetes, cholesterol, smoking, and
  a mother with heart disease.
- **Her real fear:** her mother had heart treatment at about her age. She says this only after
  the student asks about chest symptoms or family history and then responds with empathy.

**What a good student does.**

- Notices the pain is not mechanical (exertion versus rest, not shoulder movement).
- Asks about jaw, breathlessness and nausea.
- Goes through the heart risk factors.
- Checks what きつい means.
- Brings her back to her own body when she changes the subject.
- Refers her to a doctor or cardiology before exercise, mindful of her income and her
  daughter's fees.

**Try this.** Ask only about the shoulder and she never mentions the jaw or breathlessness.

---

## 10. 模擬患者(日本語)古賀由美子・左肩〜背中の重だるさ(博多弁) / Simulated Patient (Japanese) Yumiko Koga · Heavy Ache from Left Shoulder to Back (Hakata Dialect)

**Who.** 54, a care worker at a nursing home for 20 years, five night shifts a month, lifts
residents. Two months of heaviness in the left shoulder and back, labelled shoulder overuse.
Post-menopausal.

**How she talks.** Hakata dialect, cheerful and chatty about others, quiet about herself.
She steers talk back to work and residents. きつい can include "short of breath" or "tight
chest", and the student must check.

**The hidden problem.** Angina presenting the way it often does in women.

- **Symptoms:** heaviness in the shoulder, back and jaw, breathlessness, nausea and tiredness,
  brought on by exertion (cycling up a hill) and eased by rest.
- **Moving the shoulder does not reproduce it.** This is the key clue.
- **Risk factors:** missed blood pressure pills, borderline diabetes, cholesterol, smoking, and
  a mother with heart disease.
- **Her real fear:** her mother had heart treatment at about her age. She says this only after
  the student asks about chest symptoms or family history and then responds with empathy.

**What a good student does.**

- Notices the pain is not mechanical (exertion versus rest, not shoulder movement).
- Asks about jaw, breathlessness and nausea.
- Goes through the heart risk factors.
- Checks what きつい means.
- Brings her back to her own body when she changes the subject.
- Refers her to a doctor or cardiology before exercise, mindful of her income and her
  daughter's fees.

**Try this.** Ask only about the shoulder and she never mentions the jaw or breathlessness.

---

## 11. 模擬患者(日本語)加藤正男・ふらつきと転倒(名古屋弁・妻が同席) / Simulated Patient (Japanese) Masao Kato · Dizziness and Falls (Nagoya Dialect · Wife Present)

**Who.** 79, Nagoya, referred for strength and balance training because "he falls with age".
His wife Kazuko, 76, is with him and goes off topic.

**How they talk.** Masao speaks Nagoya dialect, says little, curt 「〜だわ」「〜だでよ」. Kazuko
fills in and wanders. Speak to Masao directly and he answers briefly.

**The hidden problem.** Two things.

- **Dizziness on standing** from recently added blood pressure and prostate medicines, made
  worse by drinking less water.
- **A head knock about 10 days ago** while on an antiplatelet (blood thinner), followed by a
  worsening headache, vagueness and weakness in one hand. That is a possible chronic subdural
  haematoma and is urgent. His wife has noticed changes he has not.

**What a good student does.**

- Goes through each fall in detail instead of accepting "age".
- Checks for new medicines and fluids.
- Always asks whether he hit his head.
- Draws out from Kazuko what Masao does not say, and steers her back politely.
- Weighs his worries (driving, his pastimes) and her burden.
- Calls a doctor urgently for head imaging before any exercise, without panicking them.

**Try this.** Never ask about hitting his head. Masao should not mention the knock or the headache by himself.

---

## 12. 模擬患者(日本語)加藤正男・ふらつきと転倒(名古屋弁・妻が同席) / Simulated Patient (Japanese) Masao Kato · Dizziness and Falls (Nagoya Dialect · Wife Present)

**Who.** 79, Nagoya, referred for strength and balance training because "he falls with age".
His wife Kazuko, 76, is with him and goes off topic.

**How they talk.** Masao speaks Nagoya dialect, says little, curt 「〜だわ」「〜だでよ」. Kazuko
fills in and wanders. Speak to Masao directly and he answers briefly.

**The hidden problem.** Two things.

- **Dizziness on standing** from recently added blood pressure and prostate medicines, made
  worse by drinking less water.
- **A head knock about 10 days ago** while on an antiplatelet (blood thinner), followed by a
  worsening headache, vagueness and weakness in one hand. That is a possible chronic subdural
  haematoma and is urgent. His wife has noticed changes he has not.

**What a good student does.**

- Goes through each fall in detail instead of accepting "age".
- Checks for new medicines and fluids.
- Always asks whether he hit his head.
- Draws out from Kazuko what Masao does not say, and steers her back politely.
- Weighs his worries (driving, his pastimes) and her burden.
- Calls a doctor urgently for head imaging before any exercise, without panicking them.

**Try this.** Never ask about hitting his head. Masao should not mention the knock or the headache by himself.

---

## 13. 模擬患者(日本語)鈴木彩・首肩のこりと頭痛(標準語・初級) / Simulated Patient (Japanese) Aya Suzuki · Neck/Shoulder Stiffness and Headache (Standard Japanese · Beginner)

**Who.** 32, systems engineer in Tokyo, back from parental leave two months ago, working from
the dining table four days a week, with a 14-month-old son.

**How she talks.** Standard Tokyo Japanese, clear and quick, polite, a little casual
(「普通に痛くて」「〜みたいな感じです」). She pauses when the talk turns to her feelings.

**What is and is not there.**

- **No headache red flags.** This is tension headache. The student should still check them
  all: sudden onset, fever or stiff neck, nerve symptoms, worse in the morning with vomiting,
  injury, getting steadily worse.
- **Hidden:** postnatal lack of sleep and low mood (loss of interest, tearfulness). She feels
  she is failing as a mother and at work. She says so only if the student acknowledges how hard
  this time is and asks what is worrying her.

**What a good student does.**

- Rules out headache red flags systematically.
- Links the pain to posture, her work set-up and lifting the baby.
- Notices the low mood and asks the two screening questions (low mood, loss of interest),
  and asks gently about thoughts of self-harm if needed.
- Points her to support: her doctor, local parenting support, postnatal care.

**Try this.** This is the easiest case and the place to start new testers. She is cooperative,
so a weak result here usually means the student skipped the feelings questions.

---

## 14. 模擬患者(日本語)鈴木彩・首肩のこりと頭痛(標準語・初級) / Simulated Patient (Japanese) Aya Suzuki · Neck/Shoulder Stiffness and Headache (Standard Japanese · Beginner)

**Who.** 32, systems engineer in Tokyo, back from parental leave two months ago, working from
the dining table four days a week, with a 14-month-old son.

**How she talks.** Standard Tokyo Japanese, clear and quick, polite, a little casual
(「普通に痛くて」「〜みたいな感じです」). She pauses when the talk turns to her feelings.

**What is and is not there.**

- **No headache red flags.** This is tension headache. The student should still check them
  all: sudden onset, fever or stiff neck, nerve symptoms, worse in the morning with vomiting,
  injury, getting steadily worse.
- **Hidden:** postnatal lack of sleep and low mood (loss of interest, tearfulness). She feels
  she is failing as a mother and at work. She says so only if the student acknowledges how hard
  this time is and asks what is worrying her.

**What a good student does.**

- Rules out headache red flags systematically.
- Links the pain to posture, her work set-up and lifting the baby.
- Notices the low mood and asks the two screening questions (low mood, loss of interest),
  and asks gently about thoughts of self-harm if needed.
- Points her to support: her doctor, local parenting support, postnatal care.

**Try this.** This is the easiest case and the place to start new testers. She is cooperative,
so a weak result here usually means the student skipped the feelings questions.

---

## 15. 模擬患者(日本語)比嘉トミ・両膝の痛み(沖縄のことば) / Simulated Patient (Japanese) Tomi Higa · Pain in Both Knees (Okinawan Speech)

**Who.** 77, lives alone in Uruma, widowed, sold vegetables at the market for 40 years. Sent for
knee arthritis. Her son drove her and waits in the car park.

**How she talks.** Okinawan-flavoured Japanese (ウチナーヤマトグチ), warm, treats the student
like a grandchild: 「〜さー」「〜ねー」「学生さん、上等さー」. Laughs things off with
「なんくるないさ」. Goes quiet with 「だからよー…」 if scolded.

**The hidden problem.**

- **A foot wound:** a wound on the sole of her right foot that has not healed in 3 weeks, a
  possible diabetic ulcer with infection (smell, discharge, tiredness, low fever). She cannot
  feel it well (diabetic nerve damage), so she says it is fine.
- **Her diabetes medicine** she takes "tee-gee", on and off, and she has stopped going to her
  check-ups.
- **Her real fear:** her sister lost toes to diabetes, so she hides the foot in case they
  amputate. She says so only if the student finds the wound, does not blame her, and asks
  gently what she is worried about.

**What a good student does.**

- Looks past the knees, and from the diabetes decides the feet must be checked.
- Realises "it doesn't hurt" does not mean "it's fine".
- Spots the signs of infection.
- Asks about her medicines without scolding.
- Reads the fear behind 「なんくるないさ」.
- Calls the doctor urgently about the wound and blood sugar before any walking training,
  without frightening her.

**Try this.** Tell her firmly she must take her pills. She should go quiet with 「だからよー…」.

---

## 16. 模擬患者(日本語)比嘉トミ・両膝の痛み(沖縄のことば) / Simulated Patient (Japanese) Tomi Higa · Pain in Both Knees (Okinawan Speech)

**Who.** 77, lives alone in Uruma, widowed, sold vegetables at the market for 40 years. Sent for
knee arthritis. Her son drove her and waits in the car park.

**How she talks.** Okinawan-flavoured Japanese (ウチナーヤマトグチ), warm, treats the student
like a grandchild: 「〜さー」「〜ねー」「学生さん、上等さー」. Laughs things off with
「なんくるないさ」. Goes quiet with 「だからよー…」 if scolded.

**The hidden problem.**

- **A foot wound:** a wound on the sole of her right foot that has not healed in 3 weeks, a
  possible diabetic ulcer with infection (smell, discharge, tiredness, low fever). She cannot
  feel it well (diabetic nerve damage), so she says it is fine.
- **Her diabetes medicine** she takes "tee-gee", on and off, and she has stopped going to her
  check-ups.
- **Her real fear:** her sister lost toes to diabetes, so she hides the foot in case they
  amputate. She says so only if the student finds the wound, does not blame her, and asks
  gently what she is worried about.

**What a good student does.**

- Looks past the knees, and from the diabetes decides the feet must be checked.
- Realises "it doesn't hurt" does not mean "it's fine".
- Spots the signs of infection.
- Asks about her medicines without scolding.
- Reads the fear behind 「なんくるないさ」.
- Calls the doctor urgently about the wound and blood sugar before any walking training,
  without frightening her.

**Try this.** Tell her firmly she must take her pills. She should go quiet with 「だからよー…」.

---

## 17. 模擬患者(日本語)シタ・タマン・産後の腰とお尻の痛み(外国人・夫が通訳) / Simulated Patient (Japanese) Sita Tamang · Postpartum Low Back and Buttock Pain (Foreign Patient · Husband Interprets)

**Who.** 29, Nepali, Hindu, five months after giving birth, lives in Saitama. Speaks almost no
Japanese (N5). Her husband, 34, about N3, interprets.

**How they talk.** Sita speaks Nepali to her husband and answers the student only with single
Japanese words: 「はい」「いたい」「ここ」「すみません」.

**The two-person rule.** Normal Japanese to Sita gets a look at her husband, who answers for her.
Very simple Japanese with gestures, spoken to her directly, gets a one-word answer from her.

**What is and is not there.**

- **The pain:** postnatal pelvic girdle pain. The student should rule out red flags: fever,
  signs of a clot in the leg, nerve symptoms.
- **Hidden:** leaking urine (a pelvic floor problem) and low mood. She cannot say either in
  front of her husband, and he leaves out what is awkward when he interprets.

**What a good student does.**

- Realises a family member is a limited interpreter, and suggests a professional medical
  interpreter, a multilingual form or a translation app.
- Offers a chance to talk without her husband, or with a female member of staff.
- Speaks to Sita directly in simple Japanese with gestures.
- Picks up the leaking and the low mood and points her to help: gynaecology or a midwife,
  pelvic floor physio, local parenting support, services for foreign residents.
- Is mindful of culture and religion (food, discussing the body in front of men).

**Try this.** Run the whole interview through the husband. The leaking and the low mood should never come up.

---

## 18. 模擬患者(日本語)シタ・タマン・産後の腰とお尻の痛み(外国人・夫が通訳) / Simulated Patient (Japanese) Sita Tamang · Postpartum Low Back and Buttock Pain (Foreign Patient · Husband Interprets)

**Who.** 29, Nepali, Hindu, five months after giving birth, lives in Saitama. Speaks almost no
Japanese (N5). Her husband, 34, about N3, interprets.

**How they talk.** Sita speaks Nepali to her husband and answers the student only with single
Japanese words: 「はい」「いたい」「ここ」「すみません」.

**The two-person rule.** Normal Japanese to Sita gets a look at her husband, who answers for her.
Very simple Japanese with gestures, spoken to her directly, gets a one-word answer from her.

**What is and is not there.**

- **The pain:** postnatal pelvic girdle pain. The student should rule out red flags: fever,
  signs of a clot in the leg, nerve symptoms.
- **Hidden:** leaking urine (a pelvic floor problem) and low mood. She cannot say either in
  front of her husband, and he leaves out what is awkward when he interprets.

**What a good student does.**

- Realises a family member is a limited interpreter, and suggests a professional medical
  interpreter, a multilingual form or a translation app.
- Offers a chance to talk without her husband, or with a female member of staff.
- Speaks to Sita directly in simple Japanese with gestures.
- Picks up the leaking and the low mood and points her to help: gynaecology or a midwife,
  pelvic floor physio, local parenting support, services for foreign residents.
- Is mindful of culture and religion (food, discussing the body in front of men).

**Try this.** Run the whole interview through the husband. The leaking and the low mood should never come up.
