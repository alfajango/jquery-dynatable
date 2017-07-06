let table = "\
  <table id='my-table'>\
    <thead>\
      <tr>\
        <th>Name</th>\
        <th>Hobby</th>\
        <th>Favorite Music</th>\
      </tr>\
    </thead>\
    <tbody>\
      <tr>\
        <td>Fred</td>\
        <td>Roller Skating</td>\
        <td>Disco</td>\
      </tr>\
      <tr>\
        <td>Helen</td>\
        <td>Rock Climbing</td>\
        <td>Alternative</td>\
      </tr>\
      <tr>\
        <td>Glen</td>\
        <td>Traveling</td>\
        <td>Classical</td>\
      </tr>\
    </tbody>\
  </table>\
"

describe('Normalization', () => {
  beforeEach(() => {
    $("#dynatable-spec").html(table)
  })

  afterEach(() => {
    $("#dynatable-spec").html("")
  })

  it("should create table JSON representation", () => {
    $("#my-table").dynatable()

    expect(window.history.state.dynatable.dataset.records).toEqual(
      [
        {
          "dynatable-original-index": 0,
          "name": "Fred",
          "hobby": "Roller Skating",
          "favoriteMusic": "Disco"
        },
        {
          "dynatable-original-index": 1,
          "name": "Helen",
          "hobby": "Rock Climbing",
          "favoriteMusic": "Alternative"
        },
        {
          "dynatable-original-index": 2,
          "name": "Glen",
          "hobby": "Traveling",
          "favoriteMusic": "Classical"
        }
      ]
    )
  });

  it("should convert attribute names to camelCase", () => {
    $("#my-table").dynatable({
      table: { defaultColumnIdStyle: "camelCase" }
    })

    let records = window.history.state.dynatable.dataset.records

    expect(records[0].favoriteMusic).toEqual("Disco")
    expect(records[1].favoriteMusic).toEqual("Alternative")
    expect(records[2].favoriteMusic).toEqual("Classical")
  })


  it("should convert attribute names to trim dash", () => {
    $("#my-table").dynatable({
      table: { defaultColumnIdStyle: "trimDash" }
    })

    let records = window.history.state.dynatable.dataset.records

    expect(records[0]["Favorite-Music"]).toEqual("Disco")
    expect(records[1]["Favorite-Music"]).toEqual("Alternative")
    expect(records[2]["Favorite-Music"]).toEqual("Classical")
  })

  it("should convert attribute names to dashed", () => {
    $("#my-table").dynatable({
      table: { defaultColumnIdStyle: "dashed" }
    })

    let records = window.history.state.dynatable.dataset.records

    expect(records[0]["favorite-music"]).toEqual("Disco")
    expect(records[1]["favorite-music"]).toEqual("Alternative")
    expect(records[2]["favorite-music"]).toEqual("Classical")
  })

  it("should convert attribute names to underscore", () => {
    $("#my-table").dynatable({
      table: { defaultColumnIdStyle: "underscore" }
    })

    let records = window.history.state.dynatable.dataset.records

    expect(records[0]["favorite_music"]).toEqual("Disco")
    expect(records[1]["favorite_music"]).toEqual("Alternative")
    expect(records[2]["favorite_music"]).toEqual("Classical")
  })

  it("should convert attribute names to lowercase", () => {
    $("#my-table").dynatable({
      table: { defaultColumnIdStyle: "lowercase" }
    })

    let records = window.history.state.dynatable.dataset.records

    expect(records[0]["favorite music"]).toEqual("Disco")
    expect(records[1]["favorite music"]).toEqual("Alternative")
    expect(records[2]["favorite music"]).toEqual("Classical")
  })

  it("should allow custom attribute format function", () => {
    $('#my-table').bind('dynatable:preinit', function(e, dynatable) {
      dynatable.utility.textTransform.myNewStyle = function(text) {
        return text
          .replace(/\s+/, '_')
          .replace(/[A-Z]/, function($1){ return $1 + $1 });
      };
    }).dynatable({
      table: {
        defaultColumnIdStyle: 'myNewStyle'
      },
      features: {
        paginate: false,
        search: false,
        recordCount: false,
        perPageSelect: false
      }
    });

    let records = window.history.state.dynatable.dataset.records

    expect(records).toEqual([
      {
        "dynatable-original-index": 0,
        "NName": "Fred",
        "HHobby": "Roller Skating",
        "FFavorite_Music": "Disco"
      },
      {
        "dynatable-original-index": 1,
        "NName": "Helen",
        "HHobby": "Rock Climbing",
        "FFavorite_Music": "Alternative"
      },
      {
        "dynatable-original-index": 2,
        "NName": "Glen",
        "HHobby": "Traveling",
        "FFavorite_Music": "Classical"
      }
    ])
  })

  it("should allow data-dynatable-column attribute override", () => {
    $("#my-table th:first-child").attr("data-dynatable-column", "somename")

    $("#my-table").dynatable()

    let records = window.history.state.dynatable.dataset.records

    expect(records[0]["somename"]).toEqual("Fred")
    expect(records[1]["somename"]).toEqual("Helen")
    expect(records[2]["somename"]).toEqual("Glen")
  })

  it("should render table from existing JSON", () => {

    let json = "<pre id='json-records'>" +
      JSON.stringify([
        { "band": "Weezer", "song": "El Scorcho" },
        { "band": "Chevelle", "song": "Family System" }
      ]) + "</pre>"

    $("#dynatable-spec").append(json)

    let $records = $('#json-records'),
      myRecords = JSON.parse($records.text())

    $('#my-table').dynatable({
      dataset: { records: myRecords }
    });

    let records = window.history.state.dynatable.dataset.records

    expect(records).toEqual(
      [
        {
          "band": "Weezer",
          "song": "El Scorcho"
        },
        {
          "band": "Chevelle",
          "song": "Family System"
        }
      ]
    )
  })
})
