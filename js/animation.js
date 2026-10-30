if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

const projectsSelector = {
    element: document.querySelector('.projects'),
    wrapper: document.querySelector('.projects_wrapper'),
    outro: document.querySelector('.projects_outro'),
};

const isMobile = window.matchMedia('(max-width:768px)').matches;

const createContents = () => {
    if (!projectsSelector.wrapper) return;
    if (typeof dataCol1 === 'undefined' || typeof dataCol2 === 'undefined' || typeof dataCol3 === 'undefined') {
        console.warn('Data columns not defined.');
        return;
    }

    const datasets = [dataCol1, dataCol2, dataCol3];

    datasets.forEach((data) => {
        const projectCol = document.createElement('div');
        projectCol.classList.add('projects_col');
        projectsSelector.wrapper.appendChild(projectCol);

        data.forEach((item) => {
            const projectsItem = document.createElement('div');
            projectsItem.classList.add('projects_col_item');
            projectsItem.style.background = item.backgroundColor;

            let mediaContent = '';
            if (item.type === 'video' && item.video) {
                mediaContent = `
                    <div class="projects_col_item_media">
                        <video src="${item.video}" autoplay muted loop playsinline></video>
                    </div>
                `;
            } else if (item.type === 'image' && item.img) {
                mediaContent = `
                    <div class="projects_col_item_media">
                        <img src="${item.img}" alt="" />
                    </div>
                `;
            }

            projectsItem.innerHTML = mediaContent;
            projectCol.appendChild(projectsItem);
        });
    });

    if (!isMobile) calcFilledSpace();
};

const initLenis = () => {
    if (typeof Lenis === 'undefined') return;
    const lenis = new Lenis({
        lerp: 0.064,
        smoothWheel: true,
    });

    if (typeof ScrollTrigger !== 'undefined') {
        lenis.on('scroll', ScrollTrigger.update);
    }
    if (typeof gsap !== 'undefined') {
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
    }
};

const calcFilledSpace = () => {
    const projectCols = document.querySelectorAll('.projects_col');

    if (projectCols.length < 3) {
        console.warn('Not enough project columns to calculate space.');
        return;
    }

    const projectColSecond = projectCols[1].getBoundingClientRect().height;
    const projectColThird = projectCols[2].getBoundingClientRect().height;

    const difference = projectColThird - projectColSecond;

    if (!isMobile) animateMedia(projectCols, difference);
};

const animateMedia = (projectCols, difference) => {
    if (typeof gsap === 'undefined' || !projectsSelector.element) return;
    gsap.set(projectCols[1], { y: 0 });

    gsap.timeline({
        scrollTrigger: {
            trigger: projectsSelector.element,
            start: 'top top',
            end: () => `${projectsSelector.element.offsetHeight}px bottom`,
            scrub: true,
        },
    }).to(projectCols[1], {
        duration: 2,
        y: difference,
        ease: 'none',
    });
};

const init = () => {
    createContents();
    if (!isMobile) initLenis();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
