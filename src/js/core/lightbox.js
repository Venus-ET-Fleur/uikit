import $ from 'jquery';
import {extend, getIndex, Transition} from '../util/index';

export default function (UIkit) {

    var active;

    $(document).on({
        keydown: e => {
            if (active) {
                switch (e.keyCode) {
                    case 37:
                        active.show('previous');
                        break;
                    case 39:
                        active.show('next');
                        break;
                }
            }
        }
    });

    UIkit.component('lightbox', {

        name: 'lightbox',

        props: {
            toggle: String,
            duration: Number,
            inverse: Boolean
        },

        defaults: {
            toggle: 'a',
            duration: 400,
            dark: false,
            attrItem: 'uk-lightbox-item',
            items: [],
            index: 0
        },

        ready() {

            this.toggles = $(this.toggle, this.$el);

            this.toggles.each((i, el) => {
                el = $(el);
                this.items.push({
                    index: i,
                    source: el.attr('href'),
                    title: el.attr('title'),
                    type: el.attr('type')
                })
            });

            this.$el.on('click', this.toggle + ':not(.uk-disabled)', e => {
                e.preventDefault();
                this.show(this.toggles.index(e.currentTarget));
            });

        },

        update: {

            handler() {

                var item = this.getItem();

                if (!this.modal || !item.content) {
                    return;
                }

                this.width = item.width;
                this.height = item.height;

                var maxWidth = window.innerWidth - (this.modal.panel.outerWidth(true) - this.modal.panel.width()) - this.modal.getScrollbarWidth(),
                    maxHeight = window.innerHeight - (this.modal.panel.outerHeight(true) - this.modal.panel.height()),
                    width = this.modal.panel.width(),
                    height = this.modal.panel.height();

                if (maxHeight < this.height) {
                    this.width = Math.floor(this.width * (maxHeight / this.height));
                    this.height = maxHeight;
                }

                if (maxWidth < this.width) {
                    this.height = Math.floor(this.height * (maxWidth / this.width));
                    this.width = maxWidth;
                }

                Transition
                    .stop(this.modal.panel)
                    .stop(this.modal.content);

                this.modal.content = $(item.content).css('opacity', 0).appendTo(this.modal.panel);
                this.modal.panel.css({width, height});

                Transition.start(this.modal.panel, {width: this.width, height: this.height}, this.duration).then(() => {
                    Transition.start(this.modal.content, {opacity: 1}, 400);
                });

            },

            events: ['resize', 'orientationchange']

        },

        events: {

            showitem(e) {

                var item = this.getItem();

                if (item.content) {
                    this.$update();
                    e.stopImmediatePropagation();
                }
            }

        },

        methods: {

            show(index) {

                this.index = getIndex(index, this.items, this.index);

                if (!this.modal) {
                    this.modal = UIkit.modal.dialog(`
                        <button class="uk-close uk-modal-close-outside uk-transition-hide" type="button" uk-close></button>
                        <span class="uk-icon uk-position-center uk-transition-show" uk-icon="icon: trash"></span>
                        `, {center: true});
                    this.modal.$el.css('overflow', 'hidden').addClass('uk-modal-lightbox');
                    this.modal.panel.css({width: 200, height: 200});
                    this.modal.caption = $('<div class="uk-modal-caption uk-transition-hide"></div>').appendTo(this.modal.panel);

                    if (this.items.length > 1) {
                        this.modal.panel.addClass('uk-slidenav-position').append(`
                            <div class="uk-transition-hide uk-hidden-touch ${this.dark ? 'uk-dark' : 'uk-light'}">
                                <a href="#" class="uk-slidenav uk-slidenav-previous" uk-lightbox-item="previous"></a>
                                <a href="#" class="uk-slidenav uk-slidenav-next" uk-lightbox-item="next"></a>
                            </div>
                        `);
                    }

                    this.modal.$el
                        .on('hide', this.hide)
                        .on('click', `[${this.attrItem}]`, e => {
                            e.preventDefault();
                            this.show($(e.currentTarget).attr(this.attrItem));
                        }).on('swipeRight swipeLeft', e => {
                        e.preventDefault();
                        if (!window.getSelection().toString()) {
                            this.show(e.type == 'swipeLeft' ? 'next' : 'previous');
                        }
                    });
                }

                active = this;

                this.modal.panel.addClass('uk-transition');
                this.modal.content && this.modal.content.remove();
                this.modal.caption.text(this.getItem().title);

                var event = $.Event('showitem');
                this.$el.trigger(event);
                if (!event.isImmediatePropagationStopped()) {
                    this.setError(this.getItem());
                }
            },

            hide() {

                active = active && active !== this && active;

                this.modal.hide().then(() => {
                    this.modal.$destroy(true);
                    this.modal = null;
                });
            },

            getItem() {
                return this.items[this.index] || {source: '', title: '', type: 'auto'};
            },

            setItem(item, content, width = 200, height = 200) {

                item.content = content;
                item.width = width;
                item.height = height;

                this.$update();
            },

            setError(item) {
                this.setItem(item, '<div class="uk-position-cover uk-flex uk-flex-middle uk-flex-center"><strong>Loading resource failed!</strong></div>', 400, 300);
            }

        }

    });

    UIkit.mixin({

        events: {

            showitem(e) {

                let item = this.getItem();

                if (item.type !== 'image' && item.source && !item.source.match(/\.(jp(e)?g|png|gif|svg)$/i)) {
                    return;
                }

                var img = new Image();

                img.onerror = () => this.setError(item);
                img.onload = () => this.setItem(item, `<img class="uk-responsive-width" width="${img.width}" height="${img.height}" src ="${item.source}">`, img.width, img.height);

                img.src = item.source;

                e.stopImmediatePropagation();
            }

        }

    }, 'lightbox');

    UIkit.mixin({

        events: {

            showitem(e) {

                let item = this.getItem();

                if (item.type !== 'video' && item.source && !item.source.match(/\.(mp4|webm|ogv)$/i)) {
                    return;
                }

                var vid = $('<video class="uk-responsive-width" controls></video>')
                    .on('loadedmetadata', () => this.setItem(item, vid.attr({width: vid[0].videoWidth, height: vid[0].videoHeight}), vid[0].videoWidth, vid[0].videoHeight))
                    .attr('src', item.source);

                e.stopImmediatePropagation();
            }

        }

    }, 'lightbox');

    UIkit.mixin({

        events: {

            showitem(e) {

                let item = this.getItem(), matches;

                if (!(matches = item.source.match(/\/\/.*?youtube\.[a-z]+\/watch\?v=([^&]+)&?(.*)/)) && !(item.source.match(/youtu\.be\/(.*)/))) {
                    return;
                }

                let id = matches[1],
                    img = new Image(),
                    lowres = false,
                    setIframe = (width, height) => this.setItem(item, `<iframe src="//www.youtube.com/embed/${id}" width="${width}" height="${height}" style="max-width:100%;box-sizing:border-box;"></iframe>`, width, height);

                img.onerror = () => setIframe(640, 320);
                img.onload = () => {
                    //youtube default 404 thumb, fall back to lowres
                    if (img.width === 120 && img.height === 90) {
                        if (!lowres) {
                            lowres = true;
                            img.src = `//img.youtube.com/vi/${id}/0.jpg`;
                        } else {
                            setIframe(640, 320);
                        }
                    } else {
                        setIframe(img.width, img.height);
                    }
                };

                img.src = `//img.youtube.com/vi/${id}/maxresdefault.jpg`;

                e.stopImmediatePropagation();
            }

        }

    }, 'lightbox');

    UIkit.mixin({

        events: {

            showitem(e) {

                let item = this.getItem(), matches;

                if (!(matches = item.source.match(/(\/\/.*?)vimeo\.[a-z]+\/([0-9]+).*?/))) {
                    return;
                }

                let id = matches[2],
                    setIframe = (width, height) => this.setItem(item, `<iframe src="//player.vimeo.com/video/${id}" width="${width}" height="${height}" style="max-width:100%;box-sizing:border-box;"></iframe>`, width, height);

                $.ajax({type: 'GET', url: `http://vimeo.com/api/oembed.json?url=${encodeURI(item.source)}`, jsonp: 'callback', dataType: 'jsonp'}).then((res) => setIframe(res.width, res.height));

                e.stopImmediatePropagation();
            }

        }

    }, 'lightbox');

}
