const localization = {
    en: {
      title: "Book Genie Community Library",
      searchPlaceholder: "Search books...",
      login: "Login",
      save: "Save",
      cancel: "Cancel"
    },
    es: {
      title: "Biblioteca de la Comunidad Book Genie",
      searchPlaceholder: "Buscar libros...",
      login: "Iniciar sesión",
      save: "Guardar",
      cancel: "Cancelar"
    },
    zh: {
      title: "Book Genie 社区图书馆",
      searchPlaceholder: "搜索书籍...",
      login: "登录",
      save: "保存",
      cancel: "取消"
    },
    ar: {
      title: "مكتبة مجتمع Book Genie",
      searchPlaceholder: "البحث عن الكتب...",
      login: "تسجيل الدخول",
      save: "حفظ",
      cancel: "إلغاء",
      dir: "rtl"
    }
    // Add more languages (e.g., Hindi, French, German) based on population and book market data
  };
  
  function setLanguage(lang) {
    const strings = localization[lang] || localization.en;
    document.querySelector(".library-header h1").textContent = strings.title;
    document.querySelector(".search-bar input").placeholder = strings.searchPlaceholder;
    document.querySelector(".login-btn").textContent = strings.login;
    document.querySelector(".popup .save").textContent = strings.save;
    document.querySelector(".popup .cancel").textContent = strings.cancel;
    document.documentElement.dir = strings.dir || "ltr";
  }
  
  