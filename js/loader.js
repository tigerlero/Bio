(function() {
  var sections = ['hero', 'skills', 'experience', 'freelance', 'projects', 'education', 'teaching', 'other'];
  var loaded = 0;

  sections.forEach(function(name) {
    var placeholder = document.getElementById(name + '-placeholder');
    if (!placeholder) {
      loaded++;
      return;
    }
    fetch('partials/' + name + '.html')
      .then(function(r) { return r.text(); })
      .then(function(html) {
        placeholder.innerHTML = html;
        loaded++;
        if (loaded === sections.length) {
          if (typeof initSite === 'function') initSite();
        }
      })
      .catch(function() {
        loaded++;
        if (loaded === sections.length) {
          if (typeof initSite === 'function') initSite();
        }
      });
  });
})();
