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

  afterAll(() => {
    $("#dynatable-spec").html("")
  })

  it('should create table JSON representation', () => {
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
});
