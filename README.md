# jQuery Dynatable

*A funner, semantic, HTML5+JSON, interactive table plugin.*

See the [full documentation](http://opensource.alfajango.com/dynatable).

TODO:

* Change `unfilter`s and `filter`s to `reader`s and `writer`s.
* Clean up defaults that are functions, by abstracting into internal
  named functions which can be re-used.
* Change default sort functions to underscore-namespaced functions so as
  not to conflict with record attributes called e.g. `search`.
* Update sort function implementation to be analagous to search function
  implementation (whereby if a sort function matching attribute name is
  present, it will be used for that attribute by default).
* Namespace pushstate query parameters by dynatable instance id to
  simplify `refreshQueryString` function and prevent conflicts between
  multiple pushState-enabled instances on one page.
* Refactor using prototype to abstract dynatable-global functions to
  improve memory efficiency for multiple instances on one page.
* Implement configurable sorting algorithm.
