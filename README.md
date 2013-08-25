# jQuery Dynatable

*A funner, semantic, HTML5+JSON, interactive table plugin.*

See the [full documentation](http://opensource.alfajango.com/dynatable).

TODO:

* Change `unfilter`s and `filter`s to `reader`s and `writer`s.
* ~~Clean up defaults that are functions, by abstracting into internal
  named functions which can be re-used.~~
* Change default sort functions to underscore-namespaced functions so as
  not to conflict with record attributes called e.g. `search`.
* Update sort function implementation to be analagous to search function
  implementation (whereby if a sort function matching attribute name is
  present, it will be used for that attribute by default).
* Namespace pushstate query parameters by dynatable instance id to
  simplify `refreshQueryString` function and prevent conflicts between
  multiple pushState-enabled instances on one page.
* ~~Refactor using prototype to abstract dynatable-global functions to
  improve memory efficiency for multiple instances on one page.~~
* Implement configurable sorting algorithm (see
  [JS Merge Sort](http://en.literateprograms.org/Merge_sort_%28JavaScript%29) and [Sorting Table](http://blog.vjeux.com/2010/javascript/javascript-sorting-table.html)).
* ~~Change from Object.create method to constructor pattern to improve
  performances (see
  [benchmark](http://jsperf.com/object-create-vs-constructor-vs-object-literal/7)).~~
* ~~Use for loops instead of $.each where possible to improve
  performance.~~
* Use strings and/or document fragments for writing to DOM, instead of
  jQuery, by default to improve writing performance.
* Use Chrome profiler to find any performance bottlenecks and fix.
* Simplify API by separating internal-only and accessible model
  functions.
* Move sorts and queries functions objects to defaults to make easier to
  customize and add to on instantiation (like filters and unfilters)
* Try using CSS-only for ProcessingIndicator.position to avoid querying
  rendered DOM styling and speed up all operations that position the
  indicator (see [CSS absolute
  centering](http://codepen.io/shshaw/full/gEiDt)).
