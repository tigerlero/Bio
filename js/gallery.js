(function() {
  var galleries = {};

  function initGallery(galleryId) {
    var main = document.querySelector('.gallery-main[data-gallery="' + galleryId + '"]');
    var thumbsContainer = document.querySelector('.gallery-thumbs[data-gallery="' + galleryId + '"]');
    var thumbs = thumbsContainer ? thumbsContainer.querySelectorAll('.gallery-thumb') : [];
    var prev = document.querySelector('.gallery-arrow-prev[data-gallery="' + galleryId + '"]');
    var next = document.querySelector('.gallery-arrow-next[data-gallery="' + galleryId + '"]');
    var counter = document.querySelector('.gallery-counter[data-gallery="' + galleryId + '"]');

    if (!main || thumbs.length === 0) return;

    var images = [];
    thumbs.forEach(function(th) {
      var img = th.querySelector('img');
      if (img) images.push(img.getAttribute('src'));
      else {
        var grad = th.querySelector('.thumb-gradient');
        if (grad) images.push('gradient:' + grad.style.background);
      }
    });

    var current = 0;

    function showImage(index) {
      current = index;
      thumbs.forEach(function(t, i) {
        t.classList.toggle('active', i === index);
      });
      if (counter) counter.textContent = (index + 1) + ' / ' + images.length;

      var src = images[index];
      var imgEl = main.querySelector('img');
      var gradEl = main.querySelector('.gallery-gradient');

      if (src && src.startsWith('gradient:')) {
        if (imgEl) imgEl.style.display = 'none';
        if (!gradEl) {
          gradEl = document.createElement('div');
          gradEl.className = 'gallery-gradient';
          main.appendChild(gradEl);
        }
        gradEl.style.display = 'flex';
        gradEl.style.background = src.replace('gradient:', '');
        var existingIcon = main.querySelector('.gallery-gradient i');
        if (!existingIcon) {
          var thumbGrad = thumbs[index].querySelector('.thumb-gradient');
          if (thumbGrad) {
            var icon = thumbGrad.querySelector('i');
            if (icon) gradEl.innerHTML = '<i class="' + icon.className + '" style="font-size:4rem;opacity:0.25;"></i>';
          }
        }
      } else {
        if (gradEl) gradEl.style.display = 'none';
        if (!imgEl) {
          imgEl = document.createElement('img');
          imgEl.alt = '';
          main.appendChild(imgEl);
        }
        imgEl.style.display = 'block';
        imgEl.setAttribute('src', src);
      }
    }

    thumbs.forEach(function(th, i) {
      th.addEventListener('click', function() { showImage(i); });
    });
    if (prev) prev.addEventListener('click', function() {
      showImage((current - 1 + images.length) % images.length);
    });
    if (next) next.addEventListener('click', function() {
      showImage((current + 1) % images.length);
    });

    main.addEventListener('click', function() {
      openLightbox(galleryId, current);
    });

    galleries[galleryId] = {
      images: images,
      current: current,
      showImage: showImage
    };
  }

  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lightbox-img');
  var lbCounter = document.getElementById('lightbox-counter');
  var lbPrev = document.getElementById('lightbox-prev');
  var lbNext = document.getElementById('lightbox-next');
  var lbClose = document.getElementById('lightbox-close');
  var lbGalleryId = null;
  var lbIndex = 0;

  function openLightbox(galleryId, index) {
    var g = galleries[galleryId];
    if (!g) return;
    lbGalleryId = galleryId;
    lbIndex = index;
    updateLightbox();
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function updateLightbox() {
    var g = galleries[lbGalleryId];
    if (!g) return;
    var src = g.images[lbIndex];
    if (src && src.startsWith('gradient:')) {
      lbImg.style.display = 'none';
      lbImg.src = '';
      lbCounter.textContent = (lbIndex + 1) + ' / ' + g.images.length + ' (no preview)';
      return;
    }
    lbImg.style.display = 'block';
    lbImg.src = src;
    lbCounter.textContent = (lbIndex + 1) + ' / ' + g.images.length;
  }

  function closeLightbox() {
    lb.classList.remove('open');
    document.body.style.overflow = '';
  }

  function prevLightbox() {
    var g = galleries[lbGalleryId];
    if (!g) return;
    lbIndex = (lbIndex - 1 + g.images.length) % g.images.length;
    updateLightbox();
  }

  function nextLightbox() {
    var g = galleries[lbGalleryId];
    if (!g) return;
    lbIndex = (lbIndex + 1) % g.images.length;
    updateLightbox();
  }

  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lbPrev) lbPrev.addEventListener('click', prevLightbox);
  if (lbNext) lbNext.addEventListener('click', nextLightbox);
  if (lb) lb.addEventListener('click', function(e) {
    if (e.target === lb) closeLightbox();
  });
  document.addEventListener('keydown', function(e) {
    if (!lb || !lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') prevLightbox();
    if (e.key === 'ArrowRight') nextLightbox();
  });

  window.initGallery = initGallery;
})();

(function() {
  document.querySelectorAll('.detail-section').forEach(function(el, i) {
    el.style.transitionDelay = (i * 0.07) + 's';
  });
})();
