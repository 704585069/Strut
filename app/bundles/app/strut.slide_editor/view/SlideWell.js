define(['libs/backbone',
	'strut/slide_snapshot/SlideSnapshot',
	'common/Throttler',
	'./WellContextMenu',
	'tantaman/web/interactions/Sortable',
	'strut/editor/GlobalEvents',
	'css!styles/slide_editor/slideWell.css'],
	function(Backbone, SlideSnapshot, Throttler, WellContextMenu, Sortable, GlobalEvents, css) {
		'use strict';

		/**
		 * This class is responsible for rendering left sidebar with little slide previews.
		 *
		 * @class SlideWell
		 */
		return Backbone.View.extend({
			events: {
				mousemove: '_showContextMenu',
				destroyed: 'dispose',
				mousedown: '_focused'
			},

			className: 'slideWell',

			/**
			 * Initialize slide well.
			 */
			initialize: function() {
				this._deck.on('slideAdded', this._slideAdded, this);
				this._deck.on('slidesReset', this._slidesReset, this);
				this._doShowContextMenu = this._doShowContextMenu.bind(this);
				this._throttler = new Throttler(100);
				this._contextMenu = new WellContextMenu(this._editorModel);
				this._contextMenu.render();
				this.$slides = $('<div>');
				this._sortable = new Sortable({
					container: this.$slides,
					selector: '> .slideSnapshot',
					scrollParent: this.$el[0]
				});

				this._sortable.on('sortstop', this._sortStopped, this);

				GlobalEvents.on('cut', this._cut, this);
				GlobalEvents.on('copy', this._copy, this);
				GlobalEvents.on('paste', this._paste, this);
				GlobalEvents.on('delete', this._delete, this);

				this._clipboard = this._editorModel.clipboard;
			},

			/**
			 * Event: mouse down.
			 *
			 * @param {jQuery.Event} e
			 * @private
			 */
			_focused: function(e) {
				this._editorModel.set('scope', 'slideWell');
			},

			/**
			 * React on Cut shortcut.
			 * @private
			 */
			_cut: function() {
				if (this._editorModel.get('scope') == 'slideWell') {
					var slides = this._deck.selected;
					this._clipboard.setItems(slides);
					this._deck.remove(slides);
				}
			},

			/**
			 * React on Copy shortcut.
			 * @private
			 */
			_copy: function() {
				if (this._editorModel.get('scope') == 'slideWell') {
					var slides = this._deck.selected;
					this._clipboard.setItems(slides);
				}
			},

			/**
			 * React on Paste shortcut.
			 * @private
			 */
			_paste: function() {
				var slides = this._clipboard.getItems();
				if (slides != null && slides.length && slides[0].type != undefined && slides[0].type == 'slide') {
					this._deck.add(slides);
				}
				// TODO: scroll to the new item...
			},

			/**
			 * React on Delete shortcut.
			 * @private
			 */
			_delete: function() {
				if (this._editorModel.get('scope') == 'slideWell') {
					var slides = this._deck.selected;
					this._deck.remove(slides);
				}
			},

			_sortStopped: function(startIndex, endIndex) {
				this._deck.moveSlide(startIndex, endIndex);
			},

			_showContextMenu: function(e) {
				//if (e.target != this.$el[0]) return;
				this._throttler.submit(this._doShowContextMenu, {
					rejectionPolicy: 'runLast',
					arguments: [e]
				});
			},

			/**
			 * Shoe the context menu for the slide.
			 *
			 * @param {jQuery.Event} e
			 * @private
			 */
			_doShowContextMenu: function(e) {
				var offsetY = e.pageY - this.$slides.position().top;

				// TODO: too much magic and silliness going on here
				var newPos = (((offsetY + 40) / 114) | 0) * 114 - 5;
				this._contextMenu.reposition({x: this.$slides.width() / 2 - this._contextMenu.$el.outerWidth() / 2, y: newPos});
				this._contextMenu.slideIndex(Math.ceil(newPos / 114));
			},

			/**
			 * Refresh slide snapshots on slides reset.
			 *
			 * @param {Slide[]} newSlides
			 * @private
			 */
			_slidesReset: function(newSlides) {
				var i = 0;
				newSlides.forEach(function(slide) {
					this._slideAdded(slide, i);
					i += 1;
				}, this);
			},

			/**
			 * Create a slide snapshot for the new slide.
			 *
			 * @param {Slide} slide
			 * @param {number} index
			 * @private
			 */
			_slideAdded: function(slide, index) {
				// Append it in the correct position in the well
				var snapshot = new SlideSnapshot({model: slide, deck: this._deck, registry: this._registry});
				if (index == 0) {
					this.$slides.prepend(snapshot.render().$el);
				} else {
					var $slides = $('.slideSnapshot');
					if (index >= $slides.length) {
						this.$slides.append(snapshot.render().$el);
					} else {
						$($slides[index]).before(snapshot.render().$el);
					}
				}
			},

			/**
			 * Render slide well.
			 * @returns {*}
			 */
			render: function() {
				this.$slides.html('');
				this.$el.html(this.$slides);
				this._deck.get('slides').forEach(function(slide) {
					var snapshot = new SlideSnapshot({model: slide, deck: this._deck, registry: this._registry});
					this.$slides.append(snapshot.render().$el);
				}, this);
				this.$el.append(this._contextMenu.$el);

				var self = this;
				setTimeout(function() {
					self._doShowContextMenu({pageY: 100});
				}, 0);
				return this;
			},

			/**
			 * Dispose slide well.
			 */
			dispose: function() {
				this._deck.off(null, null, this);
				this._contextMenu.dispose();
				GlobalEvents.off(null, null, this);
			},

			constructor: function SlideWell(editorModel) {
				this._deck = editorModel.deck();
				this._registry = editorModel.registry;
				this._editorModel = editorModel;
				Backbone.View.prototype.constructor.call(this);
			}
		});
	});
