# jQuery Dynatable

*A funner, semantic, HTML5+JSON, interactive table plugin.*

See the [full documentation with demos](http://www.dynatable.com).

## Why?

The purpose of Dynatable is to provide a simple, extensible API, which
makes viewing and interacting with larger datasets easy. Dynatable
provides a framework for implementing the most common elements out of
the box, including sorting, searching and filtering. Above
all, I wanted a clean and elegant API that is fun to use.

## Quickstart

To install Dynatable:

* [Download the latest release](http://jspkg.com/packages/dynatable)

## Support

IRC: [Join us at #dynatable on freenode IRC](https://webchat.freenode.net/?channels=dynatable)

Bugs and Feature Requests: [Search and open a Github Issue](https://github.com/alfajango/jquery-dynatable/issues)

Debugging: [Fork and edit this template on JSFiddle](http://jsfiddle.net/ty3b7/)

Questions: [Ask a question tagged with dynatable on
StackOverflow](http://stackoverflow.com/questions/tagged/dynatable)

## TODO:

* ~~Change `unfilter`s and `filter`s to `reader`s and `writer`s.~~
* ~~Clean up defaults that are functions, by abstracting into internal
  named functions which can be re-used.~~
* Change default sort functions to underscore-namespaced functions so as
  not to conflict with record attributes called e.g. `search`.
* Update sort function implementation to be analogous to search function
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
* ~~Use strings and/or document fragments for writing to DOM, instead of
  jQuery, by default to improve writing performance.~~
* Use templated strings to write pagination and other inputs.
* Make class names for input elements configurable.
* Use Chrome profiler to find any performance bottlenecks and fix.
* Simplify API by separating internal-only and accessible model
  functions.
* Move sorts and queries functions objects to defaults to make easier to
  customize and add to on instantiation (like filters and unfilters)
* Try using CSS-only for ProcessingIndicator.position to avoid querying
  rendered DOM styling and speed up all operations that position the
  indicator (see [CSS absolute
  centering](http://codepen.io/shshaw/full/gEiDt)).
* Add data-dynatable-attr="name" support for reading records from
  arbitrary markup (so that you don't need to write a custom rowReader
  function when starting with e.g. a stylized list).
* Make sort function first lookup settings.sortTypes[attr], then look
  directly for sort sorts.functions[attr], and then finally
  sorts.guessType only if neither of the first two exist.
* Add global remove/cleanup function (opposite of init) to allow
  removing dynatable via JS.
* Support for Zepto?

## Tests

Currently the testing process consists of opening [the Dynatable
documentation](http://os.alfajango.com/dynatable)
([source code
here](https://github.com/alfajango/alfajango.github.com/blob/master/_posts/2012-01-09-dynatable.md)) in
each browser and making sure every example works. This is fine for the
initial release, since it serves the dual purpose of helping us write
the documentation and having a written functional use-case at once.
However, one of the top priorities now is to automate each use-case in
the docs as a test case within an automated test suite.

If anyone out there thinks this sounds like fun, please contact me or
even go ahead and create an issue/pull request. Otherwise, it will be at
the top of my priority list until I can get to it.

## Contributing

Please see the [Contributing Guidelines](https://github.com/JangoSteve/jquery-dynatable/blob/master/CONTRIBUTING.md).

## Author

Steve Schwartz -
[JangoSteve on Github](https://github.com/JangoSteve),
[@jangosteve on Twitter](https://twitter.com/jangosteve)

![Alfa Jango logo](https://s3.amazonaws.com/s3.alfajango.com/github-readmes/AlfaJango_Logo_Black_noname-tiny.png)
[Alfa Jango Open Source](http://os.alfajango.com) -
[@alfajango on Twitter](https://twitter.com/alfajango)

## Copyright and License

Copyright 2014 Alfa Jango LLC.

Dual licensed, released under the Free Software Foundation's
GNU Affero General Public License (AGPL), or see [license
information](http://www.dynatable.com/license) for proprietary or
commercial applications.

## Miscellaneous

### Refactor performance benchmarks

For version 0.1.0, Dynatable went through a refactor to use prototypal
inheritence as a more memory-efficient foundation. Here are some
off-the-cuff benchmarks I set up when doing this.

The performance increase was modest, according to these benchmarks, but
more importantly, the code became a bit cleaner and easier to work with.

http://jsperf.com/dynatable-prototypal-refactor

http://jsperf.com/dynatable-refactor/3

Currently, there's still a bit of performance improvement to be gained
by further grouping DOM reads and writes (though they're already mostly
grouped together), and by using JS string concatenation instead of
jQuery to build the HTML for rendering step.

The new string concatenation has started to roll out in v0.2.
