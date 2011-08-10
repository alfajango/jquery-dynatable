/*
 * jQuery Dynatable plugin 0.0.1
 *
 * Copyright (c) 2011 Steve Schwartz (JangoSteve)
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 * Date: Thu Jul 15 11:40:00 2011 -0500
 */
//

(function($) {

  $.dynatable = function(element, options) {

    var defaults = {
          features: {
            paginate: true,
            sort: true,
            pushState: true,
            search: true,
            recordCount: true,
            perPageSelect: true
          },
          table: {
            defaultColumnIdStyle: 'camelCase',
            columns: null,
            headRowSelector: 'thead tr', // or e.g. tr:first-child
            bodyRowSelector: 'tbody tr',
            headRowClass: null,
            rowFilter: null
          },
          inputs: {
            queries: null,
            sorts: null,
            page: null,
            queryEvent: 'blur change',
            recordCountPlacement: 'after',
            paginationLinkPlacement: 'after',
            searchPlacement: 'before',
            perPagePlacement: 'before'
          },
          dataset: {
            ajax: false,
            ajaxUrl: null,
            ajaxOnLoad: false,
            ajaxMethod: 'GET',
            ajaxDataType: 'json',
            totalRecordCount: null,
            queries: null,
            queryRecordCount: null,
            page: null,
            perPage: 10,
            perPageOptions: [10,20,50,100],
            sorts: null,
            sortsKeys: null,
            records: null,
            recordsCollectionName: 'records'
          },
          filters: {},
          unfilters: {}
        },
        plugin = this,
        $element = $(element),
        settings;

    plugin.settings = {};

    plugin.init = function() {
      plugin.settings = settings = $.extend(true, {}, defaults, options);

      plugin.processingIndicator.attach();

      settings.table.columns = [];
      plugin.columns.getFromTable();
      settings.dataset.records = plugin.records.getFromTable();

      if (!settings.dataset.queryRecordCount) {
        settings.dataset.queryRecordCount = plugin.records.count();
      }

      if (!settings.dataset.totalRecordCount){
        settings.dataset.totalRecordCount = settings.dataset.queryRecordCount;
      }

      var sortsUrl = window.location.search.match(/sorts[^&=]*=[^&]*/g),
          queriesUrl = window.location.search.match(/queries[^&=]*=[^&]*/g),
          pageUrl = window.location.search.match(/page=([^&]*)/);

      settings.dataset.queries = queriesUrl ? plugin.utility.deserialize(queriesUrl)['queries'] : {};
      if (settings.dataset.queries === "") { settings.dataset.queries = {}; }

      if (settings.features.recordCount) {
        plugin.recordCount.attach();
      }

      if (settings.features.search) {
        plugin.search.attach();
      }

      if (settings.features.paginate) {
        if (!settings.dataset.ajax) {
          settings.dataset.originalRecords = $.extend(true, [], settings.dataset.records);
        }
        plugin.page.set(pageUrl ? pageUrl[1] : 1);
        plugin.paginationLinks.attach();
      }

      if (settings.features.sort) {
        settings.dataset.sorts = sortsUrl ? plugin.utility.deserialize(sortsUrl)['sorts'] : {};
        settings.dataset.sortsKeys = sortsUrl ? plugin.utility.keysFromObject(settings.dataset.sorts) : [];
        plugin.sortHeaders.attach();
      }

      if (settings.features.perPageSelect) {
        plugin.perPage.attach();
      }

      if (settings.inputs.queries) {
        plugin.queries.setupInputs();
      }

      if ((settings.dataset.ajax && settings.dataset.ajaxOnLoad) || settings.features.paginate) {
        plugin.process();
      }

      if (settings.features.pushState) {
        window.onpopstate = function(event) {
          if (event.state && event.state.dynatable) {
            plugin.state.pop(event);
          }
        }
      }
    };

    // if non-ajax, executes queryies and sorts on in-page data
    // otherwise, sends query to ajaxUrl with queryies and sorts serialized and appended in ajax data
    plugin.process = function(skipPushState) {
      var data = {
            dynatable: true
          };

      if (!$.isEmptyObject(settings.dataset.queries)) { data.queries = settings.dataset.queries; }
      plugin.processingIndicator.show();

      if (settings.features.sort && !$.isEmptyObject(settings.dataset.sorts)) { data.sorts = settings.dataset.sorts; }
      if (settings.features.paginate && settings.dataset.page) {
        var page = settings.dataset.page,
            limit = settings.dataset.perPage;
        data.page = page;
        data.limit = limit;
        data.offset = (page - 1) * limit;
      }
      if (settings.dataset.ajaxData) { $.extend(data, settings.dataset.ajaxData); }

      if (settings.dataset.ajax) {
        var options = {
          type: settings.dataset.ajaxMethod,
          data: data,
          success: function(response) {
            // Merge ajax results and meta-data into dynatables cached data
            plugin.records.updateFromJson(response);
            // update table with new records
            plugin.table.update();

            if (settings.features.pushState && !skipPushState) {
              plugin.state.push(data);
            }
          },
          complete: function() {
            plugin.processingIndicator.hide();
          }
        };
        // Do not pass url to `ajax` options if blank
        if (settings.dataset.ajaxUrl) { options.url = settings.dataset.ajaxUrl; }

        $.ajax(options);
      } else {
        if (settings.features.paginate) {
          plugin.records.resetOriginal();
        }
        plugin.queries.run();
        if (settings.features.sort) {
          plugin.records.sort();
        }
        if (settings.features.paginate) {
          plugin.records.paginate();
        }
        plugin.table.update();
        plugin.processingIndicator.hide();

        if (settings.features.pushState && !skipPushState) {
          plugin.state.push(data);
        }
      }
    };

    plugin.state = {
      push: function(data) {
        var urlString = window.location.search,
            urlOptions,
            params;

        if (urlString && /^\?/.test(urlString)) { urlString = urlString.substring(1); }
        urlOptions = plugin.utility.deserialize(urlString);
        $.extend(urlOptions, data);
        params = $.param(urlOptions);

        window.history.pushState({
          dynatable: {
            dataset: settings.dataset
          }
        }, "Dynatable state", '?' + params);
      },
      pop: function(event) {
        var data = event.state.dynatable;
        settings.dataset = data.dataset;

        plugin.table.update();
      }
    }

    plugin.table = {
      // update table contents with new records array
      // from query (whether ajax or not)
      update: function() {
        var $rows = $(),
            columns = settings.table.columns,
            rowFilter = typeof(settings.table.rowFilter) === "function" ? settings.table.rowFilter : plugin.table.row;

        // loop through records
        $.each(settings.dataset.records, function(rowIndex, record){
          var $tr = rowFilter(rowIndex, record);

          // grab the record's attribute for each column
          $.each(columns, function(colIndex, column) {
            var $td = $('<td></td>', {
              html: column.dataFilter(record)
            });
            if (column.hidden) {
              $td.hide();
            }
            $tr.append($td);
          });
          $rows = $rows.add($tr);
        });

        if (settings.features.recordCount) {
          $('#dynatable-record-count-' + element.id).replaceWith(plugin.recordCount.create());
        }
        if (settings.features.paginate) {
          $('#dynatable-pagination-links-' + element.id).replaceWith(plugin.paginationLinks.create());
        }
        if (settings.features.sort) {
          $element.find('.dynatable-arrow').remove();
          $.each(settings.dataset.sorts, function(key, value) {
            $element.find('[data-dynatable-column="' + key + '"]').each(function(){
              if (value === 1) {
                plugin.sortHeaders.appendArrowUp($(this));
              } else {
                plugin.sortHeaders.appendArrowDown($(this));
              }
            });
          });
        }
        if (settings.inputs.queries) {
          settings.inputs.queries.each(function() {
            var $this = $(this),
                q = settings.dataset.queries[$this.data('dynatable-query')];
            $(this).val(q || '');
          });
        }
        $element.find(settings.table.bodyRowSelector).remove();
        $element.append($rows);
      },
      row: function(rowIndex, record) {
        return $('<tr></tr>');
      }
    };

    // turn table headers into links which add sort to sorts array
    plugin.sortHeaders = {
      create: function(cell) {
        var $cell = $(cell),
            $link = $('<a></a>', {
              'class': 'dynatable-sort-header',
              href: '#',
              html: $cell.html()
            }),
            sorts = settings.dataset.sorts,
            sortsKeys = settings.dataset.sortsKeys,
            key = $cell.data('dynatable-column');
        $link.toggle(
          function(e) {
            plugin.sorts.add(key, 1);

            plugin.sortHeaders.appendArrowUp($link);

            plugin.process();
            e.preventDefault();
          },
          function(e) {
            plugin.sorts.add(key, -1);

            plugin.sortHeaders.appendArrowDown($link);

            plugin.process();
            e.preventDefault();
          },
          function(e) {
            plugin.sorts.remove(key);

            plugin.sortHeaders.removeArrow($link);

            plugin.process();
            e.preventDefault();
          }
        );

        if (sorts.hasOwnProperty(key)) {
          if (sorts[key] == 1) {
            plugin.sortHeaders.appendArrowUp($link);
          } else {
            plugin.sortHeaders.appendArrowDown($link);
          }
        }
        return $link;
      },
      attach: function() {
        $element.find(settings.table.headRowSelector).children('th,td').each(function(){
          plugin.sortHeaders.attachOne(this);
        });
      },
      attachOne: function(cell) {
        $(cell).html(plugin.sortHeaders.create(cell));
      },
      appendArrowUp: function($link) {
        plugin.sortHeaders.removeArrow($link);
        $link.append("<span class='dynatable-arrow'> &#9650;</span>");
      },
      appendArrowDown: function($link) {
        console.log($link.html());
        plugin.sortHeaders.removeArrow($link);
        $link.append("<span class='dynatable-arrow'> &#9660;</span>");
      },
      removeArrow: function($link) {
        // Not sure why `parent()` is needed, the arrow should be inside the link from `append()` above
        $link.parent().find('.dynatable-arrow').remove();
      }
    };

    plugin.sorts = {
      add: function(attr, direction) {
        var sortsKeys = settings.dataset.sortsKeys,
            index = sortsKeys.indexOf(attr);
        settings.dataset.sorts[attr] = direction;
        if (index === -1) { sortsKeys.push(attr); }
        return plugin;
      },
      remove: function(attr) {
        var sortsKeys = settings.dataset.sortsKeys,
            index = sortsKeys.indexOf(attr);
        delete settings.dataset.sorts[attr];
        if (index !== -1) { sortsKeys.splice(index, 1); }
        return plugin;
      },
      // Built-in sort functions
      // (the most common use-cases I could think of)
      functions: {
        number: function(a, b, attr, direction) {
          return a[attr] === b[attr] ? 0 : (direction > 0 ? a[attr] - b[attr] : b[attr] - a[attr]);
        },
        string: function(a, b, attr, direction) {
          var aAttr = a[attr].toLowerCase(), bAttr = b[attr].toLowerCase();
          var comparison = aAttr === bAttr ? 0 : (direction > 0 ? aAttr > bAttr : bAttr > aAttr);
          // force false boolean value to -1, true to 1, and tie to 0
          return comparison === false ? -1 : (comparison - 0);
        },
        originalPlacement: function(a, b) {
          return a['dynatable-original-index'] - b['dynatable-original-index'];
        }
      }
    };

    // provide a public function for selecting page
    plugin.page = {
      set: function(page) {
        settings.dataset.page = parseInt(page, 10);
      }
    };

    // For ajax, to add a query, just do 
    plugin.queries = {
      add: function(name, value) {
        // reset to first page since query will change records
        if (settings.features.paginate) {
          settings.dataset.page = 1;
        }
        settings.dataset.queries[name] = value;
        return plugin;
      },
      remove: function(name) {
        delete settings.dataset.queries[name];
        return plugin;
      },
      run: function() {
        $.each(settings.dataset.queries, function(query, value) {
          if (plugin.queries.functions[query] === undefined) {
            $.error("Query named '" + query + "' called, but not defined in queries.functions");
            return true; // to skip to next query
          }
          // collect all records that return true for query
          settings.dataset.records = $.map(settings.dataset.records, function(record) {
            return plugin.queries.functions[query](record, value) ? record : null;
          });
        });
        settings.dataset.queryRecordCount = settings.dataset.records.length;
      },
      // Shortcut for performing simple query from built-in search
      runSearch: function(q) {
        if (q) {
          plugin.queries.add('search', q);
        } else {
          plugin.queries.remove('search');
        }
        plugin.process();
      },
      setupInputs: function() {
        settings.inputs.queries.each(function() {
          var $this = $(this),
              event = $this.data('dynatable-query-event') || settings.inputs.queryEvent,
              query = $this.data('dynatable-query') || $this.attr('name') || this.id,
              queryFunction = function(e) {
                var q = $(this).val();
                if (q && q === settings.dataset.queries[query]) { return false; }
                if (q) {
                  plugin.queries.add(query, q);
                } else {
                  plugin.queries.remove(query);
                }
                plugin.process();
                e.preventDefault();
              };

          $this
            .attr('data-dynatable-query', query)
            .bind(event, queryFunction)
            .bind('keypress', function(e) {
              if (e.which == 13) {
                queryFunction.call(this, e);
              }
            });

          if (settings.dataset.queries[query]) { $this.val(decodeURIComponent(settings.dataset.queries[query])); }
        });
      },
      // Query functions for in-page querying
      // each function should take a record and a value as input
      // and output true of false as to whether the record is a match or not
      functions: {
        search: function(record, queryValue) {
          var contains = false;
          // Loop through each attribute of record
          $.each(record, function(attr, attrValue) {
            if (typeof(attrValue) === "string" && attrValue.toLowerCase().indexOf(queryValue.toLowerCase()) !== -1) {
              contains = true;
              // Don't need to keep searching attributes once found
              return false;
            } else {
              return true;
            }
          });
          return contains;
        }
      }
    };

    // pagination links which update dataset.page attribute
    plugin.paginationLinks = {
      create: function() {
        var $pageLinks = $('<ul></ul>', {
              id: 'dynatable-pagination-links-' + element.id,
              'class': 'dynatable-pagination-links',
              html: '<span>Pages: </span>'
            }),
            pageLinkClass = 'dynatable-page-link',
            activePageClass = 'dynatable-active-page',
            pages = Math.ceil(settings.dataset.queryRecordCount / settings.dataset.perPage),
            page = settings.dataset.page;

        for (var i = 1; i <= pages; i++) {
          var $link = $('<a></a>',{
                html: i,
                'class': pageLinkClass,
                'data-dynatable-page': i
              });

          if (page == i) { $link.addClass(activePageClass); }
          $pageLinks.append($link.wrap('<li></li>'));
        }

        // only bind page handler to non-active pages
        var selector = '.' + pageLinkClass + ':not(.' + activePageClass + ')';
        // kill any existing live-bindings so they don't stack up
        $(selector).die('click.dynatable');
        $(selector).live('click.dynatable', function(e) {
          $this = $(this);
          $('#dynatable-pagination-links').find('.' + activePageClass).removeClass(activePageClass);
          $this.addClass(activePageClass);

          plugin.page.set($this.data('dynatable-page'));
          plugin.process();
          e.preventDefault();
        });

        return $pageLinks;
      },
      attach: function() {
        // append page liks *after* live-event-binding so it doesn't need to
        // find and select all page links to bind event
        $element[settings.inputs.paginationLinkPlacement](plugin.paginationLinks.create());
      }
    };

    plugin.search = {
      create: function() {
        var $search = $('<input />', {
              type: 'search',
              id: 'dynatable-query-search-' + element.id,
              value: settings.dataset.queries.search
            }),
            $searchSpan = $('<span></span>', {
              id: 'dynatable-search-' + element.id,
              'class': 'dynatable-search',
              text: 'Search: '
            }).append($search);

        $search
          .bind(settings.inputs.queryEvent, function() {
            plugin.queries.runSearch($(this).val());
          })
          .bind('keypress', function(e) {
            if (e.which == 13) {
              plugin.queries.runSearch($(this).val());
              e.preventDefault();
            }
          });
        return $searchSpan;
      },
      attach: function() {
        $element[settings.inputs.searchPlacement](plugin.search.create());
      }
    };

    plugin.perPage = {
      create: function() {
        var $select = $('<select>', {
              id: 'dynatable-per-page-' + element.id,
              'class': 'dynatable-per-page'
            });

        $.each(settings.dataset.perPageOptions, function(index, number) {
          var selected = settings.dataset.perPage == number ? 'selected="selected"' : '';
          $select.append('<option value="' + number + '" ' + selected + '>' + number + '</option>');
        })

        $select.bind('change', function(e) {
          plugin.perPage.set($(this).val());
          plugin.process();
        });

        return $select.before("<span>Show: </span>");
      },
      attach: function() {
        $element[settings.inputs.perPagePlacement](plugin.perPage.create());
      },
      set: function(number) {
        settings.dataset.perPage = parseInt(number);
      }
    };

    plugin.recordCount = {
      create: function() {
        var recordsShown = settings.dataset.records.length,
            recordsQueryCount = settings.dataset.queryRecordCount,
            recordsTotal = settings.dataset.totalRecordCount,
            text = "Showing ",
            collection_name = settings.dataset.recordsCollectionName;

        if (recordsShown < recordsQueryCount && settings.features.paginate) {
          var bounds = plugin.records.pageBounds();
          text += (bounds[0] + 1) + " to " + bounds[1] + " of ";
        } else if (recordsShown === recordsQueryCount) {
          text += recordsShown + " of ";
        }
        text += recordsQueryCount + " " + collection_name;
        if (recordsQueryCount < recordsTotal) {
          text += " (filtered from " + recordsTotal + " total records)";
        }

        return $('<span></span>', {
                  id: 'dynatable-record-count-' + element.id,
                  'class': 'dynatable-record-count',
                  text: text
                });
      },
      attach: function() {
        $element[settings.inputs.recordCountPlacement](plugin.recordCount.create());
      }
    };

    plugin.processingIndicator = {
      create: function() {
        var $processing = $('<div></div>', {
              html: '<span>Processing...</span>',
              id: 'dynatable-processing-' + element.id,
              'class': 'dynatable-processing',
              style: 'position: absolute; display: none;'
            });

        return $processing;
      },
      position: function() {
        var $processing = $('#dynatable-processing-' + element.id),
            $span = $processing.children('span'),
            spanHeight = $span.outerHeight(),
            spanWidth = $span.outerWidth(),
            $covered = $element,
            offset = $covered.offset(),
            height = $covered.outerHeight(), width = $covered.outerWidth();

        $processing
          .offset({left: offset.left, top: offset.top})
          .width(width)
          .height(height)
        $span
          .offset({left: offset.left + ( (width - spanWidth) / 2 ), top: offset.top + ( (height - spanHeight) / 2 )});

        return $processing;
      },
      attach: function() {
        $element.before(plugin.processingIndicator.create());
      },
      show: function() {
        $('#dynatable-processing-' + element.id).show();
        plugin.processingIndicator.position();
      },
      hide: function() {
        $('#dynatable-processing-' + element.id).hide();
      }
    };

    plugin.records = {
      // merge ajax response json with cached data including
      // meta-data and records
      updateFromJson: function(data) {
        if ('queryRecordCount' in data) {
          settings.dataset.queryRecordCount = data.queryRecordCount;
        }
        if ('totalRecordCount' in data) {
          settings.dataset.totalRecordCount = data.totalRecordCount;
        }
        if (settings.dataset.recordsCollectionName in data) {
          settings.dataset.records = data[settings.dataset.recordsCollectionName];
        }
      },
      // For really advanced sorting,
      // see http://james.padolsey.com/javascript/sorting-elements-with-jquery/
      sort: function() {
        var sort = [].sort,
            sorts = settings.dataset.sorts,
            sortsKeys = settings.dataset.sortsKeys,
            sortType = 'string';

        var sortFunction = function(a, b) {
          var comparison;
          if ($.isEmptyObject(sorts)) {
            comparison = plugin.sorts.functions['originalPlacement'](a, b);
          } else {
            $.each(sortsKeys, function(index, attr) {
              var direction = sorts[attr];
              comparison = plugin.sorts.functions[sortType](a, b, attr, direction);
              // Don't need to sort any further unless this sort is a tie between a and b,
              // so return false to break the $.each() loop unless tied
              return comparison == 0;
            });
          }
          return comparison;
        }

        return sort.call(settings.dataset.records, sortFunction);
      },
      paginate: function() {
        var bounds = plugin.records.pageBounds(),
            first = bounds[0], last = bounds[1];
        settings.dataset.records = settings.dataset.records.slice(first, last);
      },
      resetOriginal: function() {
        settings.dataset.records = $.extend(true, [], settings.dataset.originalRecords);
      },
      pageBounds: function() {
        var page = settings.dataset.page || 1,
            first = (page - 1) * settings.dataset.perPage,
            last = first + Math.min(settings.dataset.perPage, settings.dataset.queryRecordCount);
        return [first,last];
      },
      // get initial recordset to populate table
      // if ajax, call ajaxUrl
      // otherwise, initialize from in-table records
      getFromTable: function() {
        var records = [],
            columns = settings.table.columns,
            tableRecords = $element.find(settings.table.bodyRowSelector);

        tableRecords.each(function(index){
          var record = {};
          record['dynatable-original-index'] = index;
          $(this).find('th,td').each(function(index) {
            record[columns[index].id] = columns[index].dataUnfilter(this, record);
          });
          // Allow configuration function which alters record based on attributes of 
          // table row (e.g. from html5 data- attributes)
          if (typeof(settings.table.rowUnfilter) === "function") {
            settings.table.rowUnfilter(index, this, record);
          }
          records.push(record);
        });
        return records; // 1st row is header
      },
      // count records from table
      count: function() {
        return settings.dataset.records.length;
      }
    };

    plugin.columns = {
      // initialize table[columns] array
      getFromTable: function() {
        $element.find(settings.table.headRowSelector).children('th,td').each(function(index){
          plugin.columns.add($(this), index, true);
        });
      },
      add: function($column, position, skipAppend) {
        var columns = settings.table.columns,
            label = $column.text(),
            id = $column.data('dynatable-column') || plugin.utility.normalizeText(label);

        // Add column data to plugin instance
        columns.splice(position, 0, {
          index: position,
          label: label,
          id: id,
          dataFilter: settings.filters[id] || function(record) {
            return record[id];
          },
          dataUnfilter: settings.unfilters[id] || function(cell, record) {
            return $(cell).html();
          },
          hidden: $column.css('display') === 'none'
        });

        // Modify header cell
        $column
          .attr('data-dynatable-column', id)
          .addClass('dynatable-head');
        if (settings.table.headRowClass) { $column.addClass(settings.table.headRowClass); }

        // Append column header to table
        if (!skipAppend) {
          var domPosition = position + 1;
          $element.find(settings.table.headRowSelector)
            .children('th:nth-child(' + domPosition + '),td:nth-child(' + domPosition + ')')
              .before($column);

          plugin.sortHeaders.attachOne($column.get());

          // increment the index of all columns after this one that was just inserted
          $.each(columns.slice(position + 1, columns.length), function() {
            this.index += 1;
          });

          plugin.table.update();
        }

        return plugin;
      },
      remove: function(columnIndexOrId) {
        var columns = settings.table.columns,
            length = columns.length;

        if (typeof(columnIndexOrId) === "number") {
          var column = columns[columnIndexOrId];
          plugin.columns.removeFromTable(column.id);
          plugin.columns.removeFromArray(columnIndexOrId);
        } else {
          // Traverse columns array in reverse order so that subsequent indices
          // don't get messed up when we delete an item from the array in an iteration
          for (var i = columns.length - 1; i >= 0; i--) {
            var column = columns[i];

            if (column.id === columnIndexOrId) {
              plugin.columns.removeFromTable(columnIndexOrId);
              plugin.columns.removeFromArray(i);
            }
          }
        }

        plugin.table.update();
      },
      removeFromTable: function(columnId) {
        $element.find(settings.table.headRowSelector).children('[data-dynatable-column="' + columnId + '"]').first()
          .remove();
      },
      removeFromArray: function(index) {
        var columns = settings.table.columns;
        columns.splice(index, 1);
        $.each(columns.slice(index, columns.length), function() {
          this.index -= 1;
        });
      }
    };

    plugin.utility = {
      normalizeText: function(text) {
        var style = settings.table.defaultColumnIdStyle;
        text = plugin.utility.textTransform.trimDash(text);
        text = plugin.utility.textTransform.camelCase(text);
        if (style != 'camelCase') {
          text = plugin.utility.textTransform[style](text);
        }
        return text;
      },
      textTransform: {
        trimDash: function(text) {
          return text.replace(/^\s+|\s+$/g, "").replace(/\s+/g, "-");
        },
        camelCase: function(text) {
          return text
            .replace(/(\-[a-zA-Z])/g, function($1){return $1.toUpperCase().replace('-','');})
            .replace(/^[A-Z]/, function($1){return $1.toLowerCase();});
        },
        dashed: function(text) {
          return plugin.utility.textTransform.lowercase(text.replace(/([^A-Z])([A-Z]+)/g, function($1,$2,$3){return $2 + "-" + $3;}));
        },
        underscore: function(text) {
          return plugin.utility.textTransform.lowercase(text.replace(/([^A-Z])([A-Z]+)/g, function($1,$2,$3){return $2 + "_" + $3;}));
        },
        lowercase: function(text) {
          return text.replace(/([A-Z])/g, function($1){return $1.toLowerCase();});
        }
      },
      // Deserialize params in URL to object
      // see http://stackoverflow.com/questions/1131630/javascript-jquery-param-inverse-function/3401265#3401265
      deserialize: function(query) {
        if (!query) return {};
        // modified to accept an array of partial URL strings
        if (typeof(query) === "object") { query = query.join('&'); }

        var hash = {},
            vars = query.split("&");

        for (var i = 0; i < vars.length; i++) {
          var pair = vars[i].split("="),
              k = decodeURIComponent(pair[0]),
              v = decodeURIComponent(pair[1]).replace("+", " "),
              m;

          // modified to parse multi-level parameters (e.g. "hi[there][dude]=whatsup" => hi: {there: {dude: "whatsup"}})
          while (m = k.match(/([^&=]+)\[([^&=]+)\]$/)) {
            var origV = v;
            k = m[1];
            v = {};
            v[m[2]] = origV;
          }

          // If it is the first entry with this name
          if (typeof hash[k] === "undefined") {
            if (k.substr(k.length-2) != '[]')  // not end with []. cannot use negative index as IE doesn't understand it
              hash[k] = v;
            else
              hash[k] = [v];
          // If subsequent entry with this name and not array
          } else if (typeof hash[k] === "string") {
            hash[k] = v;  // replace it
          // modified to add support for objects
          } else if (typeof hash[k] === "object") {
            hash[k] = $.extend({}, hash[k], v);
          // If subsequent entry with this name and is array
          } else {
            hash[k].push(v);
          }
        }
        return hash;
      },
      // Get array of keys from object
      // see http://stackoverflow.com/questions/208016/how-to-list-the-properties-of-a-javascript-object/208020#208020
      keysFromObject: function(obj){
        var keys = [];
        for(var key in obj){
          keys.push(key);
        }
        return keys;
      }
    };

    plugin.init();

  };

  $.fn.dynatable = function(options) {

      return this.each(function() {
          if (undefined == $(this).data('dynatable')) {
              var plugin = new $.dynatable(this, options);
              $(this).data('dynatable', plugin);
          }
      });

  };

})(jQuery);
