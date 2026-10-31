import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// العناصر الأساسية
const $ = (id) => document.getElementById(id);

const toast = $("toast");

function showMessage(message) {
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

// التنقل إلى تسجيل الدخول
function openLogin() {
  $("account").scrollIntoView({ behavior: "smooth" });
}

$("loginNav").addEventListener("click", openLogin);
$("heroLogin").addEventListener("click", openLogin);
$("examLogin").addEventListener("click", openLogin);

// قائمة الهاتف
$("menuBtn").addEventListener("click", () => {
  $("nav").classList.toggle("open");
});

// تبويبات الدخول والتسجيل
document.querySelectorAll(".tab").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(tab => {
      tab.classList.remove("active");
    });

    button.classList.add("active");

    const register = button.dataset.tab === "register";

    $("loginForm").classList.toggle("hidden", register);
    $("registerForm").classList.toggle("hidden", !register);
  });
});

// إنشاء حساب طالب
$("registerForm").addEventListener("submit", async event => {
  event.preventDefault();

  const name = $("registerName").value.trim();
  const email = $("registerEmail").value.trim();
  const password = $("registerPassword").value;

  if (!name || !email || password.length < 6) {
    showMessage("تأكد من إدخال البيانات بشكل صحيح.");
    return;
  }

  try {
    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    await setDoc(doc(db, "users", result.user.uid), {
      name,
      email,
      role: "student",
      createdAt: serverTimestamp()
    });

    showMessage("تم إنشاء حسابك بنجاح!");

    $("registerForm").reset();

  } catch (error) {
    showMessage(getErrorMessage(error));
  }
});

// تسجيل الدخول
$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();

  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);

    showMessage("تم تسجيل الدخول بنجاح!");

    $("loginForm").reset();

  } catch (error) {
    showMessage(getErrorMessage(error));
  }
});

// رسائل أخطاء Firebase
function getErrorMessage(error) {
  const messages = {
    "auth/email-already-in-use": "البريد الإلكتروني مستخدم بالفعل.",
    "auth/invalid-email": "البريد الإلكتروني غير صحيح.",
    "auth/weak-password": "كلمة المرور ضعيفة.",
    "auth/invalid-credential": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    "auth/network-request-failed": "تحقق من اتصال الإنترنت."
  };

  return messages[error.code] || "حدث خطأ. حاول مرة أخرى.";
}

// متابعة حالة المستخدم
onAuthStateChanged(auth, async user => {
  if (!user) {
    $("authCard").classList.remove("hidden");
    $("dashboard").classList.add("hidden");
    $("admin").classList.add("hidden");
    return;
  }

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
      await setDoc(userRef, {
        name: user.displayName || "طالب",
        email: user.email,
        role: "student",
        createdAt: serverTimestamp()
      });
    }

    const userData = (await getDoc(userRef)).data();

    $("authCard").classList.add("hidden");
    $("dashboard").classList.remove("hidden");

    $("welcomeTitle").textContent =
      "أهلاً بك " + (userData.name || "طالبنا");

    if (userData.role === "admin") {
      $("admin").classList.remove("hidden");
      await loadStudents();
    } else {
      $("admin").classList.add("hidden");
    }

    await loadDashboard();

    $("dashboard").scrollIntoView({ behavior: "smooth" });

  } catch (error) {
    showMessage("تعذر تحميل الحساب. تحقق من إعدادات قاعدة البيانات.");
    console.error(error);
  }
});

// تسجيل الخروج
$("logoutBtn").addEventListener("click", async () => {
  try {
    await signOut(auth);
    showMessage("تم تسجيل الخروج.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    showMessage("تعذر تسجيل الخروج.");
  }
});

// تحميل الدروس والاختبارات
async function loadDashboard() {
  const container = $("dashboardContent");

  container.innerHTML = "<p>جاري تحميل المحتوى...</p>";

  try {
    const lessonsSnapshot = await getDocs(collection(db, "lessons"));
    const questionsSnapshot = await getDocs(collection(db, "questions"));

    let html = `
      <div class="panel">
        <h3>📚 دروسك التعليمية</h3>
    `;

    if (lessonsSnapshot.empty) {
      html += "<p>لا توجد دروس مضافة حتى الآن.</p>";
    }

    lessonsSnapshot.forEach(item => {
      const lesson = item.data();

      html += `
        <article class="lesson-card">
          <h3>${escapeHTML(lesson.title)}</h3>
          <p>${escapeHTML(lesson.subject)}</p>
          <p>${escapeHTML(lesson.description)}</p>
          <div class="lesson-links">
            ${
              lesson.video
                ? `<a href="${escapeHTML(lesson.video)}" target="_blank" rel="noopener noreferrer">▶ مشاهدة الفيديو</a>`
                : ""
            }
            ${
              lesson.pdf
                ? `<a href="${escapeHTML(lesson.pdf)}" target="_blank" rel="noopener noreferrer">📄 تحميل PDF</a>`
                : ""
            }
          </div>
        </article>
      `;
    });

    html += "</div>";

    html += `
      <div class="panel">
        <h3>📝 اختبار الدراسات الاجتماعية</h3>
    `;

    if (questionsSnapshot.empty) {
      html += "<p>لا توجد أسئلة متاحة حالياً.</p>";
    } else {
      html += `<form id="studentQuiz">`;

      questionsSnapshot.forEach((item, index) => {
        const question = item.data();

        html += `
          <div class="question-card">
            <h4>${index + 1}. ${escapeHTML(question.question)}</h4>
        `;

        (question.options || []).forEach((option, optionIndex) => {
          html += `
            <label>
              <input
                type="radio"
                name="question_${item.id}"
                value="${optionIndex}"
                required
              >
              ${escapeHTML(option)}
            </label>
          `;
        });

        html += "</div>";
      });

      html += `
        <button class="btn primary full" type="submit">
          تسليم الاختبار
        </button>
      </form>`;
    }

    html += "</div>";

    html += `
      <div class="panel">
        <h3>🏆 نتائجك السابقة</h3>
        <div id="myResults">جاري تحميل النتائج...</div>
      </div>
    `;

    container.innerHTML = html;

    if (!questionsSnapshot.empty) {
      $("studentQuiz").addEventListener("submit", event => {
        submitQuiz(event, questionsSnapshot);
      });
    }

    await loadResults();

  } catch (error) {
    console.error(error);
    container.innerHTML = "<p>حدث خطأ أثناء تحميل المحتوى.</p>";
  }
}

// تصحيح الاختبار وحفظ النتيجة
async function submitQuiz(event, questionsSnapshot) {
  event.preventDefault();

  const user = auth.currentUser;

  if (!user) {
    showMessage("سجل الدخول أولاً.");
    return;
  }

  const questions = [];

  questionsSnapshot.forEach(item => {
    questions.push({
      id: item.id,
      data: item.data()
    });
  });

  let score = 0;

  questions.forEach(question => {
    const selected = document.querySelector(
      `input[name="question_${question.id}"]:checked`
    );

    if (
      selected &&
      Number(selected.value) === Number(question.data.correctAnswer)
    ) {
      score++;
    }
  });

  const total = questions.length;

  try {
    await addDoc(
      collection(db, "users", user.uid, "results"),
      {
        score,
        total,
        createdAt: serverTimestamp()
      }
    );

    showMessage(`نتيجتك ${score} من ${total}`);

    await loadResults();

  } catch (error) {
    console.error(error);
    showMessage("تعذر حفظ النتيجة. تحقق من قواعد Firestore.");
  }
}

// عرض نتائج الطالب
async function loadResults() {
  const user = auth.currentUser;

  if (!user) return;

  const container = $("myResults");

  try {
    const results = await getDocs(
      collection(db, "users", user.uid, "results")
    );

    if (results.empty) {
      container.innerHTML = "<p>لم تدخل أي اختبار حتى الآن.</p>";
      return;
    }

    let html = "";

    results.forEach(item => {
      const result = item.data();

      html += `
        <div class="result-card">
          <b>النتيجة: ${Number(result.score)} من ${Number(result.total)}</b>
        </div>
      `;
    });

    container.innerHTML = html;

  } catch (error) {
    console.error(error);
    container.textContent = "تعذر تحميل النتائج.";
  }
}

// إضافة درس من لوحة الأستاذ
$("lessonForm").addEventListener("submit", async event => {
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
    showMessage("تعذر إضافة الدرس. تأكد من صلاحيات الأستاذ.");
  }
});

// إضافة سؤال اختبار
$("quizForm").addEventListener("submit", async event => {
  event.preventDefault();

  const question = $("quizQuestion").value.trim();

  const options = [
    $("option0").value.trim(),
    $("option1").value.trim(),
    $("option2").value.trim(),
    $("option3").value.trim()
  ];

  const correctAnswer = Number($("correctAnswer").value);

  try {
    await addDoc(collection(db, "questions"), {
      question,
      options,
      correctAnswer,
      createdAt: serverTimestamp()
    });

    showMessage("تمت إضافة السؤال!");

    $("quizForm").reset();

    await loadDashboard();

  } catch (error) {
    console.error(error);
    showMessage("تعذر إضافة السؤال. تأكد من صلاحيات الأستاذ.");
  }
});

// عرض الطلاب للأستاذ
async function loadStudents() {
  const container = $("studentsList");

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
          <small>${student.role === "admin" ? "أستاذ" : "طالب"}</small>
        </div>
      `;
    });

    container.innerHTML = html;

  } catch (error) {
    console.error(error);
    container.textContent = "تعذر تحميل قائمة الطلاب.";
  }
}