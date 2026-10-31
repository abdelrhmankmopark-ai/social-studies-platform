hereimport { auth, db } from "../firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

// العناصر
const $ = id => document.getElementById(id);

const toast = $("toast");

// الرسائل
function showMessage(message) {
  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

// حماية النصوص
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

// التنقل لتسجيل الدخول
function openLogin() {
  $("account")?.scrollIntoView({
    behavior: "smooth"
  });
}

$("loginNav")?.addEventListener("click", openLogin);
$("heroLogin")?.addEventListener("click", openLogin);
$("examLogin")?.addEventListener("click", openLogin);

// قائمة الهاتف
$("menuBtn")?.addEventListener("click", () => {
  $("nav")?.classList.toggle("open");
});

// تبديل النماذج
document.querySelectorAll(".tab").forEach(button => {

  button.addEventListener("click", () => {

    document.querySelectorAll(".tab").forEach(tab => {
      tab.classList.remove("active");
    });

    button.classList.add("active");

    const register = button.dataset.tab === "register";

    $("loginForm")?.classList.toggle("hidden", register);
    $("registerForm")?.classList.toggle("hidden", !register);

  });

});

// إنشاء حساب طالب
$("registerForm")?.addEventListener("submit", async event => {

  event.preventDefault();

  const name = $("registerName").value.trim();
  const email = $("registerEmail").value.trim();
  const password = $("registerPassword").value;

  try {

    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    await setDoc(doc(db, "users", result.user.uid), {

      uid: result.user.uid,
      name: name,
      email: email,
      role: "student",
      createdAt: serverTimestamp()

    });

    showMessage("تم إنشاء حسابك بنجاح!");

  } catch (error) {

    console.error(error);

    showMessage(getErrorMessage(error));

  }

});

// تسجيل الدخول
$("loginForm")?.addEventListener("submit", async event => {

  event.preventDefault();

  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  try {

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    showMessage("تم تسجيل الدخول بنجاح!");

  } catch (error) {

    console.error(error);

    showMessage(getErrorMessage(error));

  }

});

// رسائل الأخطاء
function getErrorMessage(error) {

  const messages = {

    "auth/email-already-in-use":
      "البريد الإلكتروني مستخدم بالفعل.",

    "auth/invalid-email":
      "البريد الإلكتروني غير صحيح.",

    "auth/weak-password":
      "كلمة المرور يجب أن تكون 6 أحرف على الأقل.",

    "auth/invalid-credential":
      "البريد الإلكتروني أو كلمة المرور غير صحيحة.",

    "auth/network-request-failed":
      "تحقق من اتصال الإنترنت."

  };

  return messages[error.code] || "حدث خطأ. حاول مرة أخرى.";

}

// تسجيل الخروج
$("logoutBtn")?.addEventListener("click", async () => {

  try {

    await signOut(auth);

    showMessage("تم تسجيل الخروج.");

  } catch (error) {

    console.error(error);

    showMessage("تعذر تسجيل الخروج.");

  }

});

// حالة المستخدم
onAuthStateChanged(auth, async user => {

  $("authCard")?.classList.remove("hidden");
  $("dashboard")?.classList.add("hidden");
  $("admin")?.classList.add("hidden");

  if (!user) return;

  try {

    const userRef = doc(db, "users", user.uid);

    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {

      showMessage("بيانات الحساب غير موجودة.");

      return;

    }

    const userData = userSnap.data();

    $("authCard")?.classList.add("hidden");
    $("dashboard")?.classList.remove("hidden");

    $("welcomeTitle").textContent =
      "أهلاً بك يا " + (userData.name || "طالب");

    if (userData.role === "admin") {

      $("admin")?.classList.remove("hidden");

      await loadStudents();

    }

    await loadDashboard();

  } catch (error) {

    console.error(error);

    showMessage("تعذر تحميل الحساب. راجع صلاحيات Firebase.");

  }

});

// تحميل لوحة المستخدم
async function loadDashboard() {

  const container = $("dashboardContent");

  if (!container) return;

  container.innerHTML = "<p>جاري تحميل المحتوى...</p>";

  try {

    const lessons = await getDocs(collection(db, "lessons"));

    const questions = await getDocs(collection(db, "questions"));

    let html = "";

    html += "<h3>📚 الدروس المتاحة</h3>";

    if (lessons.empty) {

      html += "<p>لا توجد دروس حتى الآن.</p>";

    }

    lessons.forEach(item => {

      const lesson = item.data();

      html += `
        <article class="panel">
          <h3>${escapeHTML(lesson.title)}</h3>

          <p>${escapeHTML(lesson.subject)}</p>

          <p>${escapeHTML(lesson.description)}</p>

          ${
            lesson.video
              ? `<a href="${safeURL(lesson.video)}" target="_blank" rel="noopener">مشاهدة الفيديو</a>`
              : ""
          }

          <br>

          ${
            lesson.pdf
              ? `<a href="${safeURL(lesson.pdf)}" target="_blank" rel="noopener">تحميل PDF</a>`
              : ""
          }

        </article>
      `;

    });

    html += "<h3>📝 الاختبار التدريبي</h3>";

    if (questions.empty) {

      html += "<p>لا توجد أسئلة متاحة حالياً.</p>";

    } else {

      html += `<form id="studentQuiz">`;

      questions.forEach((item, index) => {

        const question = item.data();

        html += `
          <div class="panel">

            <h3>${index + 1}. ${escapeHTML(question.question)}</h3>

            ${(question.options || []).map((option, i) => `

              <label>
                <input
                  type="radio"
                  name="question_${index}"
                  value="${i}"
                  required
                >
                ${escapeHTML(option)}
              </label>

              <br>

            `).join("")}

          </div>
        `;

      });

      html += `
        <button class="btn primary full" type="submit">
          تصحيح الاختبار
        </button>
      `;

      html += "</form>";

    }

    container.innerHTML = html;

    $("studentQuiz")?.addEventListener("submit", event => {

      event.preventDefault();

      let score = 0;

      questions.forEach((item, index) => {

        const question = item.data();

        const selected = document.querySelector(
          `input[name="question_${index}"]:checked`
        );

        if (
          selected &&
          Number(selected.value) === Number(question.correctAnswer)
        ) {

          score++;

        }

      });

      showMessage(
        `انتهى الاختبار! نتيجتك ${score} من ${questions.size}`
      );

    });

  } catch (error) {

    console.error(error);

    container.innerHTML =
      "<p>تعذر تحميل المحتوى. تحقق من اتصال Firebase.</p>";

  }

}

// التحقق من الروابط
function safeURL(value) {

  try {

    const url = new URL(value);

    if (url.protocol === "https:") {
      return escapeHTML(url.href);
    }

  } catch {}

  return "#";

}

// إضافة درس
$("lessonForm")?.addEventListener("submit", async event => {

  event.preventDefault();

  const title = $("lessonTitle").value.trim();

  const subject = $("lessonSubject").value;

  const description = $("lessonDescription").value.trim();

  const video = $("lessonVideo").value.trim();

  const pdf = $("lessonPdf").value.trim();

  try {

    await addDoc(collection(db, "lessons"), {

      title,
      subject,
      description,
      video,
      pdf,

      createdAt: serverTimestamp()

    });

    showMessage("تم نشر الدرس بنجاح!");

    $("lessonForm").reset();

    await loadDashboard();

  } catch (error) {

    console.error(error);

    showMessage("تعذر نشر الدرس. راجع صلاحيات الأستاذ.");

  }

});

// إضافة سؤال
$("quizForm")?.addEventListener("submit", async event => {

  event.preventDefault();

  const question = $("quizQuestion").value.trim();

  const options = [
    $("option0").value.trim(),
    $("option1").value.trim(),
    $("option2").value.trim(),
    $("option3").value.trim()
  ];

  const correctAnswer = Number(
    $("correctAnswer").value
  );

  try {

    await addDoc(collection(db, "questions"), {

      question,
      options,
      correctAnswer,

      createdAt: serverTimestamp()

    });

    showMessage("تمت إضافة السؤال بنجاح!");

    $("quizForm").reset();

    await loadDashboard();

  } catch (error) {

    console.error(error);

    showMessage("تعذر إضافة السؤال.");

  }

});

// تحميل الطلاب
async function loadStudents() {

  const container = $("studentsList");

  if (!container) return;

  try {

    const students = await getDocs(collection(db, "users"));

    if (students.empty) {

      container.textContent = "لا يوجد طلاب مسجلون.";

      return;

    }

    let html = "";

    students.forEach(item => {

      const student = item.data();

      html += `
        <div class="student-row">

          <b>${escapeHTML(student.name || "طالب")}</b>

          <br>

          <small>${escapeHTML(student.email || "")}</small>

          <br>

          <small>
            ${student.role === "admin" ? "أستاذ" : "طالب"}
          </small>

        </div>
      `;

    });

    container.innerHTML = html;

  } catch (error) {

    console.error(error);

    container.textContent =
      "تعذر تحميل قائمة الطلاب.";

  }

}
