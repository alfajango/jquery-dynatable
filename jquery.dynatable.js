/*
 * jQuery Dynatable plugin 0.3.1
 *
 * Copyright (c) 2014 Steve Schwartz (JangoSteve)
 *
 * Dual licensed under the AGPL and Proprietary licenses:
 *   http://www.dynatable.com/license/
 *
 * Date: Tue Jan 02 2014
 */
//

(function($) {
  var defaults,
      mergeSettings,
      dt,
      Model,
      modelPrototypes = {
        dom: Dom,
        domColumns: DomColumns,
        records: Records,
        recordsCount: RecordsCount,
        processingIndicator: ProcessingIndicator,
        state: State,
        sorts: Sorts,
        sortsHeaders: SortsHeaders,
        queries: Queries,
        inputsSearch: InputsSearch,
        paginationPage: PaginationPage,
        paginationPerPage: PaginationPerPage,
        paginationLinks: PaginationLinks
      },
      utility,
      build,
      processAll,
      initModel,
      defaultRowWriter,
      defaultCellWriter,
      defaultAttributeWriter,
      defaultAttributeReader;

  //-----------------------------------------------------------------
  // Cached plugin global defaults
  //-----------------------------------------------------------------

  defaults = {
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
      copyHeaderAlignment: true,
      copyHeaderClass: false
    },
    inputs: {
      queries: null,
      sorts: null,
      multisort: ['ctrlKey', 'shiftKey', 'metaKey'],
      page: null,
      queryEvent: 'blur change',
      recordCountTarget: null,
      recordCountPlacement: 'after',
      paginationLinkTarget: null,
      paginationLinkPlacement: 'after',
      paginationClass: 'dynatable-pagination-links',
      paginationLinkClass: 'dynatable-page-link',
      paginationPrevClass: 'dynatable-page-prev',
      paginationNextClass: 'dynatable-page-next',
      paginationActiveClass: 'dynatable-active-page',
      paginationDisabledClass: 'dynatable-disabled-page',
      paginationPrev: 'Previous',
      paginationNext: 'Next',
      paginationGap: [1,2,2,1],
      searchTarget: null,
      searchPlacement: 'before',
      searchText: 'Search: ',
      perPageTarget: null,
      perPagePlacement: 'before',
      perPageText: 'Show: ',
      pageText: 'Pages: ',
      recordCountPageBoundTemplate: '{pageLowerBound} to {pageUpperBound} of',
      recordCountPageUnboundedTemplate: '{recordsShown} of',
      recordCountTotalTemplate: '{recordsQueryCount} {collectionName}',
      recordCountFilteredTemplate: ' (filtered from {recordsTotal} total records)',
      recordCountText: 'Showing',
      recordCountTextTemplate: '{text} {pageTemplate} {totalTemplate} {filteredTemplate}',
      recordCountTemplate: '<span id="dynatable-record-count-{elementId}" class="dynatable-record-count">{textTemplate}</span>',
      processingText: 'Processing...'
    },
    dataset: {
      ajax: false,
      ajaxUrl: null,
      ajaxCache: null,
      ajaxOnLoad: false,
      ajaxMethod: 'GET',
      ajaxDataType: 'json',
      totalRecordCount: null,
      queries: {},
      queryRecordCount: null,
      page: null,
      perPageDefault: 10,
      perPageOptions: [10,20,50,100],
      sorts: {},
      sortsKeys: [],
      sortTypes: {},
      records: null
    },
    writers: {
      _rowWriter: defaultRowWriter,
      _cellWriter: defaultCellWriter,
      _attributeWriter: defaultAttributeWriter
    },
    readers: {
      _rowReader: null,
      _attributeReader: defaultAttributeReader
    },
    params: {
      dynatable: 'dynatable',
      queries: 'queries',
      sorts: 'sorts',
      page: 'page',
      perPage: 'perPage',
      offset: 'offset',
      records: 'records',
      record: null,
      queryRecordCount: 'queryRecordCount',
      totalRecordCount: 'totalRecordCount'
    }
  };

  //-----------------------------------------------------------------
  // Each dynatable instance inherits from this,
  // set properties specific to instance
  //-----------------------------------------------------------------

  dt = {
    init: function(element, options) {
      this.settings = mergeSettings(options);
      this.element = element;
      this.$element = $(element);

      // All the setup that doesn't require element or options
      build.call(this);

      return this;
    },

    process: function(skipPushState) {
      processAll.call(this, skipPushState);
    }
  };

  //-----------------------------------------------------------------
  // Cached plugin global functions
  //-----------------------------------------------------------------

  mergeSettings = function(options) {
    var newOptions = $.extend(true, {}, defaults, options);

    // TODO: figure out a better way to do this.
    // Doing `extend(true)` causes any elements that are arrays
    // to merge the default and options arrays instead of overriding the defaults.
    if (options) {
      if (options.inputs) {
        if (options.inputs.multisort) {
          newOptions.inputs.multisort = options.inputs.multisort;
        }
        if (options.inputs.paginationGap) {
          newOptions.inputs.paginationGap = options.inputs.paginationGap;
        }
      }
      if (options.dataset && options.dataset.perPageOptions) {
        newOptions.dataset.perPageOptions = options.dataset.perPageOptions;
      }
    }

    return newOptions;
  };

  build = function() {
    this.$element.trigger('dynatable:preinit', this);

    for (model in modelPrototypes) {
      if (modelPrototypes.hasOwnProperty(model)) {
        var modelInstance = this[model] = new modelPrototypes[model](this, this.settings);
        if (modelInstance.initOnLoad()) {
          modelInstance.init();
        }
      }
    }

    this.$element.trigger('dynatable:init', this);

    if (!this.settings.dataset.ajax || (this.settings.dataset.ajax && this.settings.dataset.ajaxOnLoad) || this.settings.features.paginate || (this.settings.features.sort && !$.isEmptyObject(this.settings.dataset.sorts))) {
      this.process();
    }
  };

  processAll = function(skipPushState) {
    var data = {};

    this.$element.trigger('dynatable:beforeProcess', data);

    if (!$.isEmptyObject(this.settings.dataset.queries)) { data[this.settings.params.queries] = this.settings.dataset.queries; }
    // TODO: Wrap this in a try/rescue block to hide the processing indicator and indicate something went wrong if error
    this.processingIndicator.show();

    if (this.settings.features.sort && !$.isEmptyObject(this.settings.dataset.sorts)) { data[this.settings.params.sorts] = this.settings.dataset.sorts; }
    if (this.settings.features.paginate && this.settings.dataset.page) {
      var page = this.settings.dataset.page,
          perPage = this.settings.dataset.perPage;
      data[this.settings.params.page] = page;
      data[this.settings.params.perPage] = perPage;
      data[this.settings.params.offset] = (page - 1) * perPage;
    }
    if (this.settings.dataset.ajaxData) { $.extend(data, this.settings.dataset.ajaxData); }

    // If ajax, sends query to ajaxUrl with queries and sorts serialized and appended in ajax data
    // otherwise, executes queries and sorts on in-page data
    if (this.settings.dataset.ajax) {
      var _this = this;
      var options = {
        type: _this.settings.dataset.ajaxMethod,
        dataType: _this.settings.dataset.ajaxDataType,
        data: data,
        error: function(xhr, error) {
          _this.$element.trigger('dynatable:ajax:error', {xhr: xhr, error : error});
        },
        success: function(response) {
          _this.$element.trigger('dynatable:ajax:success', response);
          // Merge ajax results and meta-data into dynatables cached data
          _this.records.updateFromJson(response);
          // update table with new records
          _this.dom.update();

          if (!skipPushState && _this.state.initOnLoad()) {
            _this.state.push(data);
          }
        },
        complete: function() {
          _this.processingIndicator.hide();
        }
      };
      // Do not pass url to `ajax` options if blank
      if (this.settings.dataset.ajaxUrl) {
        options.url = this.settings.dataset.ajaxUrl;

      // If ajaxUrl is blank, then we're using the current page URL,
      // we need to strip out any query, sort, or page data controlled by dynatable
      // that may have been in URL when page loaded, so that it doesn't conflict with
      // what's passed in with the data ajax parameter
      } else {
        options.url = utility.refreshQueryString(window.location.href, {}, this.settings);
      }
      if (this.settings.dataset.ajaxCache !== null) { options.cache = this.settings.dataset.ajaxCache; }

      $.ajax(options);
    } else {
      this.records.resetOriginal();
      this.queries.run();
      if (this.settings.features.sort) {
        this.records.sort();
      }
      if (this.settings.features.paginate) {
        this.records.paginate();
      }
      this.dom.update();
      this.processingIndicator.hide();

      if (!skipPushState && this.state.initOnLoad()) {
        this.state.push(data);
      }
    }

    this.$element.addClass('dynatable-loaded');
    this.$element.trigger('dynatable:afterProcess', data);
  };

  function defaultRowWriter(rowIndex, record, columns, cellWriter) {
    var tr = '';

    // grab the record's attribute for each column
    for (var i = 0, len = columns.length; i < len; i++) {
      tr += cellWriter(columns[i], record);
    }

    return '<tr>' + tr + '</tr>';
  };

  function defaultCellWriter(column, record) {
    var html = column.attributeWriter(record),
        td = '<td';

    if (column.hidden || column.textAlign) {
      td += ' style="';

      // keep cells for hidden column headers hidden
      if (column.hidden) {
        td += 'display: none;';
      }

      // keep cells aligned as their column headers are aligned
      if (column.textAlign) {
        td += 'text-align: ' + column.textAlign + ';';
      }

      td += '"';
    }

    if (column.cssClass) {
      td += ' class="' + column.cssClass + '"';
    }

    return td + '>' + html + '</td>';
  };

  function defaultAttributeWriter(record) {
    // `this` is the column object in settings.columns
    // TODO: automatically convert common types, such as arrays and objects, to string
    return record[this.id];
  };

  function defaultAttributeReader(cell, record) {
    return $(cell).html();
  };

  //-----------------------------------------------------------------
  // Dynatable object model prototype
  // (all object models get these default functions)
  //-----------------------------------------------------------------

  Model = {
    initOnLoad: function() {
      return true;
    },

    init: function() {}
  };

  for (model in modelPrototypes) {
    if (modelPrototypes.hasOwnProperty(model)) {
      var modelPrototype = modelPrototypes[model];
      modelPrototype.prototype = Model;
    }
  }

  //-----------------------------------------------------------------
  // Dynatable object models
  //-----------------------------------------------------------------

  function Dom(obj, settings) {
    var _this = this;

    // update table contents with new records array
    // from query (whether ajax or not)
    this.update = function() {
      var rows = '',
          columns = settings.table.columns,
          rowWriter = settings.writers._rowWriter,
          cellWriter = settings.writers._cellWriter;

      obj.$element.trigger('dynatable:beforeUpdate', rows);

      // loop through records
      for (var i = 0, len = settings.dataset.records.length; i < len; i++) {
        var record = settings.dataset.records[i],
            tr = rowWriter(i, record, columns, cellWriter);
        rows += tr;
      }

      // Appended dynatable interactive elements
      if (settings.features.recordCount) {
        $('#dynatable-record-count-' + obj.element.id).replaceWith(obj.recordsCount.create());
      }
      if (settings.features.paginate) {
        $('#dynatable-pagination-links-' + obj.element.id).replaceWith(obj.paginationLinks.create());
        if (settings.features.perPageSelect) {
          $('#dynatable-per-page-' + obj.element.id).val(parseInt(settings.dataset.perPage));
        }
      }

      // Sort headers functionality
      if (settings.features.sort && columns) {
        obj.sortsHeaders.removeAllArrows();
        for (var i = 0, len = columns.length; i < len; i++) {
          var column = columns[i],
              sortedByColumn = utility.allMatch(settings.dataset.sorts, column.sorts, function(sorts, sort) { return sort in sorts; }),
              value = settings.dataset.sorts[column.sorts[0]];

          if (sortedByColumn) {
            obj.$element.find('[data-dynatable-column="' + column.id + '"]').find('.dynatable-sort-header').each(function(){
              if (value == 1) {
                obj.sortsHeaders.appendArrowUp($(this));
              } else {
                obj.sortsHeaders.appendArrowDown($(this));
              }
            });
          }
        }
      }

      // Query search functionality
      if (settings.inputs.queries || settings.features.search) {
        var allQueries = settings.inputs.queries || $();
        if (settings.features.search) {
          allQueries = allQueries.add('#dynatable-query-search-' + obj.element.id);
        }

        allQueries.each(function() {
          var $this = $(this),
              q = settings.dataset.queries[$this.data('dynatable-query')];
          $this.val(q || '');
        });
      }

      obj.$element.find(settings.table.bodyRowSelector).remove();
      obj.$element.append(rows);

      obj.$element.trigger('dynatable:afterUpdate', rows);
    };
  };

  function DomColumns(obj, settings) {
    var _this = this;

    this.initOnLoad = function() {
      return obj.$element.is('table');
    };

    this.init = function() {
      settings.table.columns = [];
      this.getFromTable();
    };

    // initialize table[columns] array
    this.getFromTable = function() {
      var $columns = obj.$element.find(settings.table.headRowSelector).children('th,td');
      if ($columns.length) {
        $columns.each(function(index){
          _this.add($(this), index, true);
        });
      } else {
        return $.on(
            'error',
            'Couldn\'t find any columns headers in \'' +
                settings.table.headRowSelector +
                ' th,td\'. If your header row is different, specify the selector in the table: headRowSelector option.');
      }
    };

    this.add = function($column, position, skipAppend, skipUpdate) {
      var columns = settings.table.columns, label = $column.text(),
          id = $column.data('dynatable-column') ||
          utility.normalizeText(label, settings.table.defaultColumnIdStyle),
          dataSorts = $column.data('dynatable-sorts'),
          sorts = dataSorts ? $.map(dataSorts.split(','), function(text) {
            return text.trim();
          }) : [id];

      // If the column id is blank, generate an id for it
      if ( !id ) {
        this.generate($column);
        id = $column.data('dynatable-column');
      }
      // Add column data to plugin instance
      columns.splice(position, 0, {
        index: position,
        label: label,
        id: id,
        attributeWriter: settings.writers[id] || settings.writers._attributeWriter,
        attributeReader: settings.readers[id] || settings.readers._attributeReader,
        sorts: sorts,
        hidden: $column.css('display') === 'none',
        textAlign: settings.table.copyHeaderAlignment && $column.css('text-align'),
        cssClass: settings.table.copyHeaderClass && $column.attr('class')
      });

      // Modify header cell
      $column
        .attr('data-dynatable-column', id)
        .addClass('dynatable-head');
      if (settings.table.headRowClass) {
        $column.addClass(settings.table.headRowClass);
      }

      // Append column header to table
      if (!skipAppend) {
        var domPosition = position + 1,
            $sibling = obj.$element.find(settings.table.headRowSelector)
              .children('th:nth-child(' + domPosition + '),td:nth-child(' + domPosition + ')').first(),
            columnsAfter = columns.slice(position + 1, columns.length);

        if ($sibling.length) {
          $sibling.before($column);
          // sibling column doesn't yet exist (maybe this is the last column in
          // the header row)
        } else {
          obj.$element.find(settings.table.headRowSelector).append($column);
        }

        obj.sortsHeaders.attachOne($column.get());

        // increment the index of all columns after this one that was just inserted
        if (columnsAfter.length) {
          for (var i = 0, len = columnsAfter.length; i < len; i++) {
            columnsAfter[i].index += 1;
          }
        }

        if (!skipUpdate) {
          obj.dom.update();
        }
      }

      return dt;
    };

    this.remove = function(columnIndexOrId) {
      var columns = settings.table.columns,
          length = columns.length;

      if (typeof(columnIndexOrId) === "number") {
        var column = columns[columnIndexOrId];
        this.removeFromTable(column.id);
        this.removeFromArray(columnIndexOrId);
      } else {
        // Traverse columns array in reverse order so that subsequent indices
        // don't get messed up when we delete an item from the array in an iteration
        for (var i = columns.length - 1; i >= 0; i--) {
          var column = columns[i];

          if (column.id === columnIndexOrId) {
            this.removeFromTable(columnIndexOrId);
            this.removeFromArray(i);
          }
        }
      }

      obj.dom.update();
    };

    this.removeFromTable = function(columnId) {
      obj.$element.find(settings.table.headRowSelector).children('[data-dynatable-column="' + columnId + '"]').first()
        .remove();
    };

    this.removeFromArray = function(index) {
      var columns = settings.table.columns,
          adjustColumns;
      columns.splice(index, 1);
      adjustColumns = columns.slice(index, columns.length);
      for (var i = 0, len = adjustColumns.length; i < len; i++) {
        adjustColumns[i].index -= 1;
      }
    };

    this.generate = function($cell) {
      var cell = $cell === undefined ? $('<th></th>') : $cell;
      return this.attachGeneratedAttributes(cell);
    };

    this.attachGeneratedAttributes = function($cell) {
      // Use increment to create unique column name that is the same each time the page is reloaded,
      // in order to avoid errors with mismatched attribute names when loading cached `dataset.records` array
      var increment = obj.$element.find(settings.table.headRowSelector).children('th[data-dynatable-generated]').length;
      return $cell
        .attr('data-dynatable-column', 'dynatable-generated-' + increment) //+ utility.randomHash(),
        .attr('data-dynatable-no-sort', 'true')
        .attr('data-dynatable-generated', increment);
    };
  };

  function Records(obj, settings) {
    var _this = this;

    this.initOnLoad = function() {
      return !settings.dataset.ajax;
    };

    this.init = function() {
      if (settings.dataset.records === null) {
        settings.dataset.records = this.getFromTable();

        if (!settings.dataset.queryRecordCount) {
          settings.dataset.queryRecordCount = this.count();
        }

        if (!settings.dataset.totalRecordCount){
          settings.dataset.totalRecordCount = settings.dataset.queryRecordCount;
        }
      }

      // Create cache of original full recordset (unpaginated and unqueried)
      settings.dataset.originalRecords = $.extend(true, [], settings.dataset.records);
    };

    // merge ajax response json with cached data including
    // meta-data and records
    this.updateFromJson = function(data) {
      var records;
      if (settings.params.records === "_root") {
        records = data;
      } else if (settings.params.records in data) {
        records = data[settings.params.records];
      }
      if (settings.params.record) {
        var len = records.length - 1;
        for (var i = 0; i < len; i++) {
          records[i] = records[i][settings.params.record];
        }
      }
      if (settings.params.queryRecordCount in data) {
        settings.dataset.queryRecordCount = data[settings.params.queryRecordCount];
      }
      if (settings.params.totalRecordCount in data) {
        settings.dataset.totalRecordCount = data[settings.params.totalRecordCount];
      }
      settings.dataset.records = records;
    };

    // For really advanced sorting,
    // see http://james.padolsey.com/javascript/sorting-elements-with-jquery/
    this.sort = function() {
      var sort = [].sort,
          sorts = settings.dataset.sorts,
          sortsKeys = settings.dataset.sortsKeys,
          sortTypes = settings.dataset.sortTypes;

      var sortFunction = function(a, b) {
        var comparison;
        if ($.isEmptyObject(sorts)) {
          comparison = obj.sorts.functions['originalPlacement'](a, b);
        } else {
          for (var i = 0, len = sortsKeys.length; i < len; i++) {
            var attr = sortsKeys[i],
                direction = sorts[attr],
                sortType = sortTypes[attr] || obj.sorts.guessType(a, b, attr);
            comparison = obj.sorts.functions[sortType](a, b, attr, direction);
            // Don't need to sort any further unless this sort is a tie between a and b,
            // so break the for loop unless tied
            if (comparison !== 0) { break; }
          }
        }
        return comparison;
      }

      return sort.call(settings.dataset.records, sortFunction);
    };

    this.paginate = function() {
      var bounds = this.pageBounds(),
          first = bounds[0], last = bounds[1];
      settings.dataset.records = settings.dataset.records.slice(first, last);
    };

    this.resetOriginal = function() {
      settings.dataset.records = settings.dataset.originalRecords || [];
    };

    this.pageBounds = function() {
      var page = settings.dataset.page || 1,
          first = (page - 1) * settings.dataset.perPage,
          last = Math.min(first + settings.dataset.perPage, settings.dataset.queryRecordCount);
      return [first,last];
    };

    // get initial recordset to populate table
    // if ajax, call ajaxUrl
    // otherwise, initialize from in-table records
    this.getFromTable = function() {
      var records = [],
          columns = settings.table.columns,
          tableRecords = obj.$element.find(settings.table.bodyRowSelector);

      tableRecords.each(function(index){
        var record = {};
        record['dynatable-original-index'] = index;
        $(this).find('th,td').each(function(index) {
          if (columns[index] === undefined) {
            // Header cell didn't exist for this column, so let's generate and append
            // a new header cell with a randomly generated name (so we can store and
            // retrieve the contents of this column for each record)
            obj.domColumns.add(obj.domColumns.generate(), columns.length, false, true); // don't skipAppend, do skipUpdate
          }
          var value = columns[index].attributeReader(this, record),
              attr = columns[index].id;

          // If value from table is HTML, let's get and cache the text equivalent for
          // the default string sorting, since it rarely makes sense for sort headers
          // to sort based on HTML tags.
          if (typeof(value) === "string" && value.match(/\s*\<.+\>/)) {
            if (! record['dynatable-sortable-text']) {
              record['dynatable-sortable-text'] = {};
            }
            record['dynatable-sortable-text'][attr] =
                $('<div></div>').html(value).text().trim();
          }

          record[attr] = value;
        });
        // Allow configuration function which alters record based on attributes of
        // table row (e.g. from html5 data- attributes)
        if (typeof(settings.readers._rowReader) === "function") {
          settings.readers._rowReader(index, this, record);
        }
        records.push(record);
      });
      return records; // 1st row is header
    };

    // count records from table
    this.count = function() {
      return settings.dataset.records.length;
    };
  };

  function RecordsCount(obj, settings) {
    this.initOnLoad = function() {
      return settings.features.recordCount;
    };

    this.init = function() {
      this.attach();
    };

    this.create = function() {
      var pageTemplate = '',
          filteredTemplate = '',
          options = {
            elementId: obj.element.id,
            recordsShown: obj.records.count(),
            recordsQueryCount: settings.dataset.queryRecordCount,
            recordsTotal: settings.dataset.totalRecordCount,
            collectionName: settings.params.records === "_root" ? "records" : settings.params.records,
            text: settings.inputs.recordCountText
          };

      if (settings.features.paginate) {

        // If currently displayed records are a subset (page) of the entire collection
        if (options.recordsShown < options.recordsQueryCount) {
          var bounds = obj.records.pageBounds();
          options.pageLowerBound = bounds[0] + 1;
          options.pageUpperBound = bounds[1];
          pageTemplate = settings.inputs.recordCountPageBoundTemplate;

        // Else if currently displayed records are the entire collection
        } else if (options.recordsShown === options.recordsQueryCount) {
          pageTemplate = settings.inputs.recordCountPageUnboundedTemplate;
        }
      }

      // If collection for table is queried subset of collection
      if (options.recordsQueryCount < options.recordsTotal) {
        filteredTemplate = settings.inputs.recordCountFilteredTemplate;
      }

      // Populate templates with options
      options.pageTemplate = utility.template(pageTemplate, options);
      options.filteredTemplate = utility.template(filteredTemplate, options);
      options.totalTemplate = utility.template(settings.inputs.recordCountTotalTemplate, options);
      options.textTemplate = utility.template(settings.inputs.recordCountTextTemplate, options);

      return utility.template(settings.inputs.recordCountTemplate, options);
    };

    this.attach = function() {
      var $target = settings.inputs.recordCountTarget ? $(settings.inputs.recordCountTarget) : obj.$element;
      $target[settings.inputs.recordCountPlacement](this.create());
    };
  };

  function ProcessingIndicator(obj, settings) {
    this.init = function() {
      this.attach();
    };

    this.create = function() {
      var $processing = $('<div></div>', {
            html: '<span>' + settings.inputs.processingText + '</span>',
            id: 'dynatable-processing-' + obj.element.id,
            'class': 'dynatable-processing',
            style: 'position: absolute; display: none;'
          });

      return $processing;
    };

    this.position = function() {
      var $processing = $('#dynatable-processing-' + obj.element.id),
          $span = $processing.children('span'),
          spanHeight = $span.outerHeight(),
          spanWidth = $span.outerWidth(),
          $covered = obj.$element,
          offset = $covered.offset(),
          height = $covered.outerHeight(), width = $covered.outerWidth();

      $processing
        .offset({left: offset.left, top: offset.top})
        .width(width)
        .height(height)
      $span
        .offset({left: offset.left + ( (width - spanWidth) / 2 ), top: offset.top + ( (height - spanHeight) / 2 )});

      return $processing;
    };

    this.attach = function() {
      obj.$element.before(this.create());
    };

    this.show = function() {
      $('#dynatable-processing-' + obj.element.id).show();
      this.position();
    };

    this.hide = function() {
      $('#dynatable-processing-' + obj.element.id).hide();
    };
  };

  function State(obj, settings) {
    this.initOnLoad = function() {
      // Check if pushState option is true, and if browser supports it
      return settings.features.pushState && history.pushState;
    };

    this.init = function() {
      window.onpopstate = function(event) {
        if (event.state && event.state.dynatable) {
          obj.state.pop(event);
        }
      }
    };

    this.push = function(data) {
      var urlString = window.location.search,
          urlOptions,
          path,
          params,
          hash,
          newParams,
          cacheStr,
          cache,
          // replaceState on initial load, then pushState after that
          firstPush = !(window.history.state && window.history.state.dynatable),
          pushFunction = firstPush ? 'replaceState' : 'pushState';

      if (urlString && /^\?/.test(urlString)) { urlString = urlString.substring(1); }
      $.extend(urlOptions, data);

      params = utility.refreshQueryString(urlString, data, settings);
      if (params) { params = '?' + params; }
      hash = window.location.hash;
      path = window.location.pathname;

      obj.$element.trigger('dynatable:push', data);

      cache = { dynatable: { dataset: settings.dataset } };
      if (!firstPush) { cache.dynatable.scrollTop = $(window).scrollTop(); }
      cacheStr = JSON.stringify(cache);

      // Mozilla has a 640k char limit on what can be stored in pushState.
      // See "limit" in https://developer.mozilla.org/en/DOM/Manipulating_the_browser_history#The_pushState().C2.A0method
      // and "dataStr.length" in http://wine.git.sourceforge.net/git/gitweb.cgi?p=wine/wine-gecko;a=patch;h=43a11bdddc5fc1ff102278a120be66a7b90afe28
      //
      // Likewise, other browsers may have varying (undocumented) limits.
      // Also, Firefox's limit can be changed in about:config as browser.history.maxStateObjectSize
      // Since we don't know what the actual limit will be in any given situation, we'll just try caching and rescue
      // any exceptions by retrying pushState without caching the records.
      //
      // I have absolutely no idea why perPageOptions suddenly becomes an array-like object instead of an array,
      // but just recently, this started throwing an error if I don't convert it:
      // 'Uncaught Error: DATA_CLONE_ERR: DOM Exception 25'
      cache.dynatable.dataset.perPageOptions = $.makeArray(cache.dynatable.dataset.perPageOptions);

      try {
        window.history[pushFunction](cache, "Dynatable state", path + params + hash);
      } catch(error) {
        // Make cached records = null, so that `pop` will rerun process to retrieve records
        cache.dynatable.dataset.records = null;
        cache.dynatable.dataset.originalRecords = null;
        try {
          window.history[pushFunction](cache, "Dynatable state", path + params + hash);
        } catch(error2) {
          console.error("Error pushing state to history, skipping.", error2);
        }
      }
    };

    this.pop = function(event) {
      if ( event.state.dynatable.dataset.originalRecords === null) {
        event.state.dynatable.dataset.originalRecords = settings.dataset.originalRecords;
      }

      var data = event.state.dynatable;
      settings.dataset = data.dataset;

      if (data.scrollTop) { $(window).scrollTop(data.scrollTop); }

      // If dataset.records is cached from pushState
      if ( data.dataset.records ) {
        obj.dom.update();
      } else {
        obj.process(true);
      }
    };
  };

  function Sorts(obj, settings) {
    this.initOnLoad = function() {
      return settings.features.sort;
    };

    this.init = function() {
      var sortsUrl = window.location.search.match(new RegExp(settings.params.sorts + '[^&=]*=[^&]*', 'g'));
      if (sortsUrl) {
        settings.dataset.sorts = utility.deserialize(sortsUrl)[settings.params.sorts];
      }
      if (!settings.dataset.sortsKeys.length) {
        settings.dataset.sortsKeys = utility.keysFromObject(settings.dataset.sorts);
      }
    };

    this.add = function(attr, direction) {
      var sortsKeys = settings.dataset.sortsKeys,
          index = $.inArray(attr, sortsKeys);
      settings.dataset.sorts[attr] = direction;
      obj.$element.trigger('dynatable:sorts:added', [attr, direction]);
      if (index === -1) { sortsKeys.push(attr); }
      return dt;
    };

    this.remove = function(attr) {
      var sortsKeys = settings.dataset.sortsKeys,
          index = $.inArray(attr, sortsKeys);
      delete settings.dataset.sorts[attr];
      obj.$element.trigger('dynatable:sorts:removed', attr);
      if (index !== -1) { sortsKeys.splice(index, 1); }
      return dt;
    };

    this.clear = function() {
      settings.dataset.sorts = {};
      settings.dataset.sortsKeys.length = 0;
      obj.$element.trigger('dynatable:sorts:cleared');
    };

    // Try to intelligently guess which sort function to use
    // based on the type of attribute values.
    // Consider using something more robust than `typeof` (http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/)
    this.guessType = function(a, b, attr) {
      var types = {
            string: 'string',
            number: 'number',
            'boolean': 'number',
            object: 'number' // dates and null values are also objects, this works...
          },
          attrType = a[attr] ? typeof(a[attr]) : typeof(b[attr]),
          type = types[attrType] || 'number';
      return type;
    };

    // Built-in sort functions
    // (the most common use-cases I could think of)
    this.functions = {
      number: function(a, b, attr, direction) {
        return a[attr] === b[attr] ? 0 : (direction > 0 ? a[attr] - b[attr] : b[attr] - a[attr]);
      },
      string: function(a, b, attr, direction) {
        var aAttr = (a['dynatable-sortable-text'] && a['dynatable-sortable-text'][attr]) ? a['dynatable-sortable-text'][attr] : a[attr],
            bAttr = (b['dynatable-sortable-text'] && b['dynatable-sortable-text'][attr]) ? b['dynatable-sortable-text'][attr] : b[attr],
            comparison;
        aAttr = aAttr.toLowerCase();
        bAttr = bAttr.toLowerCase();
        comparison = aAttr === bAttr ? 0 : (direction > 0 ? aAttr > bAttr : bAttr > aAttr);
        // force false boolean value to -1, true to 1, and tie to 0
        return comparison === false ? -1 : (comparison - 0);
      },
      originalPlacement: function(a, b) {
        return a['dynatable-original-index'] - b['dynatable-original-index'];
      }
    };
  };

  // turn table headers into links which add sort to sorts array
  function SortsHeaders(obj, settings) {
    var _this = this;

    this.initOnLoad = function() {
      return settings.features.sort;
    };

    this.init = function() {
      this.attach();
    };

    this.create = function(cell) {
      var $cell = $(cell),
          $link = $('<a></a>', {
            'class': 'dynatable-sort-header',
            href: '#',
            html: $cell.html()
          }),
          id = $cell.data('dynatable-column'),
          column = utility.findObjectInArray(settings.table.columns, {id: id});

      $link.on('click', function(e) {
        _this.toggleSort(e, $link, column);
        obj.process();

        e.preventDefault();
      });

      if (this.sortedByColumn($link, column)) {
        if (this.sortedByColumnValue(column) == 1) {
          this.appendArrowUp($link);
        } else {
          this.appendArrowDown($link);
        }
      }

      return $link;
    };

    this.removeAll = function() {
      obj.$element.find(settings.table.headRowSelector).children('th,td').each(function(){
        _this.removeAllArrows();
        _this.removeOne(this);
      });
    };

    this.removeOne = function(cell) {
      var $cell = $(cell),
          $link = $cell.find('.dynatable-sort-header');
      if ($link.length) {
        var html = $link.html();
        $link.remove();
        $cell.html($cell.html() + html);
      }
    };

    this.attach = function() {
      obj.$element.find(settings.table.headRowSelector).children('th,td').each(function(){
        _this.attachOne(this);
      });
    };

    this.attachOne = function(cell) {
      var $cell = $(cell);
      if (!$cell.data('dynatable-no-sort')) {
        $cell.html(this.create(cell));
      }
    };

    this.appendArrowUp = function($link) {
      this.removeArrow($link);
      $link.append("<span class='dynatable-arrow'> &#9650;</span>");
    };

    this.appendArrowDown = function($link) {
      this.removeArrow($link);
      $link.append("<span class='dynatable-arrow'> &#9660;</span>");
    };

    this.removeArrow = function($link) {
      // Not sure why `parent()` is needed, the arrow should be inside the link from `append()` above
      $link.find('.dynatable-arrow').remove();
    };

    this.removeAllArrows = function() {
      obj.$element.find('.dynatable-arrow').remove();
    };

    this.toggleSort = function(e, $link, column) {
      var sortedByColumn = this.sortedByColumn($link, column),
          value = this.sortedByColumnValue(column);
      // Clear existing sorts unless this is a multisort event
      if (!settings.inputs.multisort || !utility.anyMatch(e, settings.inputs.multisort, function(evt, key) { return e[key]; })) {
        this.removeAllArrows();
        obj.sorts.clear();
      }

      // If sorts for this column are already set
      if (sortedByColumn) {
        // If ascending, then make descending
        if (value == 1) {
          for (var i = 0, len = column.sorts.length; i < len; i++) {
            obj.sorts.add(column.sorts[i], -1);
          }
          this.appendArrowDown($link);
        // If descending, remove sort
        } else {
          for (var i = 0, len = column.sorts.length; i < len; i++) {
            obj.sorts.remove(column.sorts[i]);
          }
          this.removeArrow($link);
        }
      // Otherwise, if not already set, set to ascending
      } else {
        for (var i = 0, len = column.sorts.length; i < len; i++) {
          obj.sorts.add(column.sorts[i], 1);
        }
        this.appendArrowUp($link);
      }
    };

    this.sortedByColumn = function($link, column) {
      return utility.allMatch(settings.dataset.sorts, column.sorts, function(sorts, sort) { return sort in sorts; });
    };

    this.sortedByColumnValue = function(column) {
      return settings.dataset.sorts[column.sorts[0]];
    };
  };

  function Queries(obj, settings) {
    var _this = this;

    this.initOnLoad = function() {
      return settings.inputs.queries || settings.features.search;
    };

    this.init = function() {
      var queriesUrl = window.location.search.match(new RegExp(settings.params.queries + '[^&=]*=[^&]*', 'g'));

      settings.dataset.queries = queriesUrl ? utility.deserialize(queriesUrl)[settings.params.queries] : {};
      if (settings.dataset.queries === "") { settings.dataset.queries = {}; }

      if (settings.inputs.queries) {
        this.setupInputs();
      }
    };

    this.add = function(name, value) {
      // reset to first page since query will change records
      if (settings.features.paginate) {
        settings.dataset.page = 1;
      }
      settings.dataset.queries[name] = value;
      obj.$element.trigger('dynatable:queries:added', [name, value]);
      return dt;
    };

    this.remove = function(name) {
      delete settings.dataset.queries[name];
      obj.$element.trigger('dynatable:queries:removed', name);
      return dt;
    };

    this.run = function() {
      for (query in settings.dataset.queries) {
        if (settings.dataset.queries.hasOwnProperty(query)) {
          var value = settings.dataset.queries[query];
          if (_this.functions[query] === undefined) {
            // Try to lazily evaluate query from column names if not explicitly defined
            var queryColumn = utility.findObjectInArray(settings.table.columns, {id: query});
            if (queryColumn) {
              _this.functions[query] = function(record, queryValue) {
                return record[query] == queryValue;
              };
            } else {
              $.on(
                  'error',
                  'Query named \'' + query +
                      '\' called, but not defined in queries.functions');
              continue; // to skip to next query
            }
          }
          // collect all records that return true for query
          settings.dataset.records = $.map(settings.dataset.records, function(record) {
            return _this.functions[query](record, value) ? record : null;
          });
        }
      }
      settings.dataset.queryRecordCount = obj.records.count();
    };

    // Shortcut for performing simple query from built-in search
    this.runSearch = function(q) {
      var origQueries = $.extend({}, settings.dataset.queries);
      if (q) {
        this.add('search', q);
      } else {
        this.remove('search');
      }
      if (!utility.objectsEqual(settings.dataset.queries, origQueries)) {
        obj.process();
      }
    };

    this.setupInputs = function() {
      settings.inputs.queries.each(function() {
        var $this = $(this),
            event = $this.data('dynatable-query-event') || settings.inputs.queryEvent,
            query = $this.data('dynatable-query') || $this.attr('name') || this.id,
            queryFunction = function(e) {
              var q = $(this).val();
              if (q === "") { q = undefined; }
              if (q === settings.dataset.queries[query]) { return false; }
              if (q) {
                _this.add(query, q);
              } else {
                _this.remove(query);
              }
              obj.process();
              e.preventDefault();
            };

        $this.attr('data-dynatable-query', query)
            .on(event, queryFunction)
            .on('keypress', function(e) {
              if (e.which == 13) {
                queryFunction.call(this, e);
              }
            });

        if (settings.dataset.queries[query]) { $this.val(decodeURIComponent(settings.dataset.queries[query])); }
      });
    };

    // Query functions for in-page querying
    // each function should take a record and a value as input
    // and output true of false as to whether the record is a match or not
    this.functions = {
      search: function(record, queryValue) {
        var contains = false;
        // Loop through each attribute of record
        for (attr in record) {
          if (record.hasOwnProperty(attr)) {
            var attrValue = record[attr];
            if (typeof(attrValue) === "string" && attrValue.toLowerCase().indexOf(queryValue.toLowerCase()) !== -1) {
              contains = true;
              // Don't need to keep searching attributes once found
              break;
            } else {
              continue;
            }
          }
        }
        return contains;
      }
    };
  };

  function InputsSearch(obj, settings) {
    var _this = this;

    this.initOnLoad = function() {
      return settings.features.search;
    };

    this.init = function() {
      this.attach();
    };

    this.create = function() {
      var $search = $('<input />', {
            type: 'search',
            id: 'dynatable-query-search-' + obj.element.id,
            'data-dynatable-query': 'search',
            value: settings.dataset.queries.search
          }),
          $searchSpan = $('<span></span>', {
            id: 'dynatable-search-' + obj.element.id,
            'class': 'dynatable-search',
            text: settings.inputs.searchText
          }).append($search);

      $search
          .on(settings.inputs.queryEvent,
              function() {
                obj.queries.runSearch($(this).val());
              })
          .on('keypress', function(e) {
            if (e.which == 13) {
              obj.queries.runSearch($(this).val());
              e.preventDefault();
            }
          });
      return $searchSpan;
    };

    this.attach = function() {
      var $target = settings.inputs.searchTarget ? $(settings.inputs.searchTarget) : obj.$element;
      $target[settings.inputs.searchPlacement](this.create());
    };
  };

  // provide a public function for selecting page
  function PaginationPage(obj, settings) {
    this.initOnLoad = function() {
      return settings.features.paginate;
    };

    this.init = function() {
      var pageUrl = window.location.search.match(new RegExp(settings.params.page + '=([^&]*)'));
      // If page is present in URL parameters and pushState is enabled
      // (meaning that it'd be possible for dynatable to have put the
      // page parameter in the URL)
      if (pageUrl && settings.features.pushState) {
        this.set(pageUrl[1]);
      } else {
        this.set(1);
      }
    };

    this.set = function(page) {
      var newPage = parseInt(page, 10);
      settings.dataset.page = newPage;
      obj.$element.trigger('dynatable:page:set', newPage);
    }
  };

  function PaginationPerPage(obj, settings) {
    var _this = this;

    this.initOnLoad = function() {
      return settings.features.paginate;
    };

    this.init = function() {
      var perPageUrl = window.location.search.match(new RegExp(settings.params.perPage + '=([^&]*)'));

      // If perPage is present in URL parameters and pushState is enabled
      // (meaning that it'd be possible for dynatable to have put the
      // perPage parameter in the URL)
      if (perPageUrl && settings.features.pushState) {
        // Don't reset page to 1 on init, since it might override page
        // set on init from URL
        this.set(perPageUrl[1], true);
      } else {
        this.set(settings.dataset.perPageDefault, true);
      }

      if (settings.features.perPageSelect) {
        this.attach();
      }
    };

    this.create = function() {
      var $select = $('<select>', {
            id: 'dynatable-per-page-' + obj.element.id,
            'class': 'dynatable-per-page-select'
          });

      for (var i = 0, len = settings.dataset.perPageOptions.length; i < len; i++) {
        var number = settings.dataset.perPageOptions[i],
            selected = settings.dataset.perPage == number ? 'selected="selected"' : '';
        $select.append('<option value="' + number + '" ' + selected + '>' + number + '</option>');
      }

      $select.on('change', function(e) {
        _this.set($(this).val());
        obj.process();
      });

      return $('<span />', {
        'class': 'dynatable-per-page'
      }).append("<span class='dynatable-per-page-label'>" + settings.inputs.perPageText + "</span>").append($select);
    };

    this.attach = function() {
      var $target = settings.inputs.perPageTarget ? $(settings.inputs.perPageTarget) : obj.$element;
      $target[settings.inputs.perPagePlacement](this.create());
    };

    this.set = function(number, skipResetPage) {
      var newPerPage = parseInt(number);
      if (!skipResetPage) { obj.paginationPage.set(1); }
      settings.dataset.perPage = newPerPage;
      obj.$element.trigger('dynatable:perPage:set', newPerPage);
    };
  };

  // pagination links which update dataset.page attribute
  function PaginationLinks(obj, settings) {
    var _this = this;

    this.initOnLoad = function() {
      return settings.features.paginate;
    };

    this.init = function() {
      this.attach();
    };

    this.create = function() {
      var pageLinks = '<ul id="' + 'dynatable-pagination-links-' + obj.element.id + '" class="' + settings.inputs.paginationClass + '">',
          pageLinkClass = settings.inputs.paginationLinkClass,
          activePageClass = settings.inputs.paginationActiveClass,
          disabledPageClass = settings.inputs.paginationDisabledClass,
          pages = Math.ceil(settings.dataset.queryRecordCount / settings.dataset.perPage),
          page = settings.dataset.page,
          breaks = [
            settings.inputs.paginationGap[0],
            settings.dataset.page - settings.inputs.paginationGap[1],
            settings.dataset.page + settings.inputs.paginationGap[2],
            (pages + 1) - settings.inputs.paginationGap[3]
          ];

      pageLinks += '<li><span>' + settings.inputs.pageText + '</span></li>';

      for (var i = 1; i <= pages; i++) {
        if ( (i > breaks[0] && i < breaks[1]) || (i > breaks[2] && i < breaks[3])) {
          // skip to next iteration in loop
          continue;
        } else {
          var li = obj.paginationLinks.buildLink(i, i, pageLinkClass, page == i, activePageClass),
              breakIndex,
              nextBreak;

          // If i is not between one of the following
          // (1 + (settings.paginationGap[0]))
          // (page - settings.paginationGap[1])
          // (page + settings.paginationGap[2])
          // (pages - settings.paginationGap[3])
          breakIndex = $.inArray(i, breaks);
          nextBreak = breaks[breakIndex + 1];
          if (breakIndex > 0 && i !== 1 && nextBreak && nextBreak > (i + 1)) {
            var ellip = '<li><span class="dynatable-page-break">&hellip;</span></li>';
            li = breakIndex < 2 ? ellip + li : li + ellip;
          }

          if (settings.inputs.paginationPrev && i === 1) {
            var prevLi = obj.paginationLinks.buildLink(page - 1, settings.inputs.paginationPrev, pageLinkClass + ' ' + settings.inputs.paginationPrevClass, page === 1, disabledPageClass);
            li = prevLi + li;
          }
          if (settings.inputs.paginationNext && i === pages) {
            var nextLi = obj.paginationLinks.buildLink(page + 1, settings.inputs.paginationNext, pageLinkClass + ' ' + settings.inputs.paginationNextClass, page === pages, disabledPageClass);
            li += nextLi;
          }

          pageLinks += li;
        }
      }

      pageLinks += '</ul>';

      // only bind page handler to non-active and non-disabled page links
      var selector = '#dynatable-pagination-links-' + obj.element.id + ' a.' + pageLinkClass + ':not(.' + activePageClass + ',.' + disabledPageClass + ')';
      // kill any existing delegated-bindings so they don't stack up
      $(document).off('click.dynatable', selector);
      $(document).on('click.dynatable', selector, function(e) {
        $this = $(this);
        $this.closest(settings.inputs.paginationClass).find('.' + activePageClass).removeClass(activePageClass);
        $this.addClass(activePageClass);

        obj.paginationPage.set($this.data('dynatable-page'));
        obj.process();
        e.preventDefault();
      });

      return pageLinks;
    };

    this.buildLink = function(page, label, linkClass, conditional, conditionalClass) {
      var link = '<a data-dynatable-page=' + page + ' class="' + linkClass,
          li = '<li';

      if (conditional) {
        link += ' ' + conditionalClass;
        li += ' class="' + conditionalClass + '"';
      }

      link += '">' + label + '</a>';
      li += '>' + link + '</li>';

      return li;
    };

    this.attach = function() {
      // append page links *after* delegate-event-binding so it doesn't need to
      // find and select all page links to bind event
      var $target = settings.inputs.paginationLinkTarget ? $(settings.inputs.paginationLinkTarget) : obj.$element;
      $target[settings.inputs.paginationLinkPlacement](obj.paginationLinks.create());
    };
  };

  utility = dt.utility = {
    normalizeText: function(text, style) {
      text = this.textTransform[style](text);
      return text;
    },
    textTransform: {
      trimDash: function(text) {
        return text.replace(/^\s+|\s+$/g, "").replace(/\s+/g, "-");
      },
      camelCase: function(text) {
        text = this.trimDash(text);
        return text
          .replace(/(\-[a-zA-Z])/g, function($1){return $1.toUpperCase().replace('-','');})
          .replace(/([A-Z])([A-Z]+)/g, function($1,$2,$3){return $2 + $3.toLowerCase();})
          .replace(/^[A-Z]/, function($1){return $1.toLowerCase();});
      },
      dashed: function(text) {
        text = this.trimDash(text);
        return this.lowercase(text);
      },
      underscore: function(text) {
        text = this.trimDash(text);
        return this.lowercase(text.replace(/(-)/g, '_'));
      },
      lowercase: function(text) {
        return text.replace(/([A-Z])/g, function($1){return $1.toLowerCase();});
      }
    },
    // Deserialize params in URL to object
    // see
    // http://stackoverflow.com/questions/1131630/javascript-jquery-param-inverse-function/3401265#3401265
    deserialize: function(query) {
      if (!query) return {};
      // modified to accept an array of partial URL strings
      if (typeof(query) === "object") {
        query = query.join('&');
      }

      var hash = {},
          vars = query.split("&");

      for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("="),
            k = decodeURIComponent(pair[0]),
            v, m;

        if (!pair[1]) {
          continue
        };
        v = decodeURIComponent(pair[1].replace(/\+/g, ' '));

        // modified to parse multi-level parameters (e.g. "hi[there][dude]=whatsup" => hi: {there: {dude: "whatsup"}})
        while (m = k.match(/([^&=]+)\[([^&=]+)\]$/)) {
          var origV = v;
          k = m[1];
          v = {};

          // If nested param ends in '][', then the regex above erroneously included half of a trailing '[]',
          // which indicates the end-value is part of an array
          if (m[2].substr(m[2].length-2) == '][') { // must use substr for IE to understand it
            v[m[2].substr(0,m[2].length-2)] = [origV];
          } else {
            v[m[2]] = origV;
          }
        }

        // If it is the first entry with this name
        if (typeof hash[k] === "undefined") {
          if (k.substr(k.length-2) != '[]') { // not end with []. cannot use negative index as IE doesn't understand it
            hash[k] = v;
          } else {
            hash[k] = [v];
          }
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
    refreshQueryString: function(urlString, data, settings) {
      var _this = this,
          queryString = urlString.split('?'),
          path = queryString.shift(),
          urlOptions;

      urlOptions = this.deserialize(urlString);

      // Loop through each dynatable param and update the URL with it
      for (attr in settings.params) {
        if (settings.params.hasOwnProperty(attr)) {
          var label = settings.params[attr];
          // Skip over parameters matching attributes for disabled features (i.e. leave them untouched),
          // because if the feature is turned off, then parameter name is a coincidence and it's unrelated to dynatable.
          if (
            (!settings.features.sort && attr == "sorts") ||
              (!settings.features.paginate && _this.anyMatch(attr, ["page", "perPage", "offset"], function(attr, param) { return attr == param; }))
          ) {
            continue;
          }

          // Delete page and offset from url params if on page 1 (default)
          if ((attr === "page" || attr === "offset") && data["page"] === 1) {
            if (urlOptions[label]) {
              delete urlOptions[label];
            }
            continue;
          }

          // Delete perPage from url params if default perPage value
          if (attr === "perPage" && data[label] == settings.dataset.perPageDefault) {
            if (urlOptions[label]) {
              delete urlOptions[label];
            }
            continue;
          }

          // For queries, we're going to handle each possible query parameter individually here instead of
          // handling the entire queries object below, since we need to make sure that this is a query controlled by dynatable.
          if (attr == "queries" && data[label]) {
            var queries = settings.inputs.queries || [],
                inputQueries = $.makeArray(queries.map(function() { return $(this).attr('name') }));

            if (settings.features.search) {
              inputQueries.push('search');
            }

            for (var i = 0, len = inputQueries.length; i < len; i++) {
              var attr = inputQueries[i];
              if (data[label][attr]) {
                if (typeof urlOptions[label] === 'undefined') {
                  urlOptions[label] = {};
                }
                urlOptions[label][attr] = data[label][attr];
              } else {
                if (urlOptions && urlOptions[label] && urlOptions[label][attr]) {
                  delete urlOptions[label][attr];
                }
              }
            }
            continue;
          }

          // If we haven't returned true by now, then we actually want to update the parameter in the URL
          if (data[label]) {
            urlOptions[label] = data[label];
          } else {
            delete urlOptions[label];
          }
        }
      }
      return $.param(urlOptions);
    },
    // Get array of keys from object
    // see
    // http://stackoverflow.com/questions/208016/how-to-list-the-properties-of-a-javascript-object/208020#208020
    keysFromObject: function(obj) {
      var keys = [];
      for (var key in obj){
        keys.push(key);
      }
      return keys;
    },
    // Find an object in an array of objects by attributes.
    // E.g. find object with {id: 'hi', name: 'there'} in an array of objects
    findObjectInArray: function(array, objectAttr) {
      var _this = this,
          foundObject;
      for (var i = 0, len = array.length; i < len; i++) {
        var item = array[i];
        // For each object in array, test to make sure all attributes in objectAttr match
        if (_this.allMatch(item, objectAttr, function(item, key, value) { return item[key] == value; })) {
          foundObject = item;
          break;
        }
      }
      return foundObject;
    },
    // Return true if supplied test function passes for ALL items in an array
    allMatch: function(item, arrayOrObject, test) {
      // start off with true result by default
      var match = true, isArray = Array.isArray(arrayOrObject);
      // Loop through all items in array
      $.each(arrayOrObject, function(key, value) {
        var result = isArray ? test(item, value) : test(item, key, value);
        // If a single item tests false, go ahead and break the array by returning false
        // and return false as result,
        // otherwise, continue with next iteration in loop
        // (if we make it through all iterations without overriding match with false,
        // then we can return the true result we started with by default)
        if (!result) { return match = false; }
      });
      return match;
    },
    // Return true if supplied test function passes for ANY items in an array
    anyMatch: function(item, arrayOrObject, test) {
      var match = false, isArray = Array.isArray(arrayOrObject);

      $.each(arrayOrObject, function(key, value) {
        var result = isArray ? test(item, value) : test(item, key, value);
        if (result) {
          // As soon as a match is found, set match to true, and return false to stop the `$.each` loop
          match = true;
          return false;
        }
      });
      return match;
    },
    // Return true if two objects are equal
    // (i.e. have the same attributes and attribute values)
    objectsEqual: function(a, b) {
      for (attr in a) {
        if (a.hasOwnProperty(attr)) {
          if (!b.hasOwnProperty(attr) || a[attr] !== b[attr]) {
            return false;
          }
        }
      }
      for (attr in b) {
        if (b.hasOwnProperty(attr) && !a.hasOwnProperty(attr)) {
          return false;
        }
      }
      return true;
    },
    // Taken from
    // http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/105074#105074
    randomHash: function() {
      return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    },
    // Adapted from
    // http://stackoverflow.com/questions/377961/efficient-javascript-string-replacement/378001#378001
    template: function(str, data) {
      return str.replace(/{(\w*)}/g, function(match, key) {
        return data.hasOwnProperty(key) ? data[key] : "";
      });
    }
  };

  //-----------------------------------------------------------------
  // Build the dynatable plugin
  //-----------------------------------------------------------------

  // Object.create support test, and fallback for browsers without it
  if ( typeof Object.create !== "function" ) {
    Object.create = function (o) {
      function F() {}
      F.prototype = o;
      return new F();
    };
  }

  //-----------------------------------------------------------------
  // Global dynatable plugin setting defaults
  //-----------------------------------------------------------------

  $.dynatableSetup = function(options) {
    defaults = mergeSettings(options);
  };

  // Create dynatable plugin based on a defined object
  $.dynatable = function( object ) {
    $.fn['dynatable'] = function( options ) {
      return this.each(function() {
        if ( ! $.data( this, 'dynatable' ) ) {
          $.data( this, 'dynatable', Object.create(object).init(this, options) );
        }
      });
    };
  };

  $.dynatable(dt);

})(jQuery);
