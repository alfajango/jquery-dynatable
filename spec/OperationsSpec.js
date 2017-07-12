let sortTable = "\
  <table id='sorting-example'>\
    <thead>\
      <tr>\
        <th>Make</th>\
        <th>Model</th>\
        <th>Year</th>\
        <th>Price</th>\
      </tr>\
    </thead>\
    <tbody>\
      <tr>\
        <td><img>Ford</td>\
        <td>Escape</td>\
        <td>2001</td>\
        <td>4,000</td>\
      </tr>\
      <tr>\
        <td><img>Mini</td>\
        <td>Cooper</td>\
        <td>2001</td>\
        <td>8,500</td>\
      </tr>\
      <tr>\
        <td><img>Ford</td>\
        <td>Focus SVT</td>\
        <td>2003</td>\
        <td>9,000</td>\
      </tr>\
      <tr>\
        <td><img alt=\"won't affect sorting\">Volkswagen</td>\
        <td>Jetta Wolfsburg</td>\
        <td>2008</td>\
        <td>11,000</td>\
      </tr>\
      <tr>\
        <td><img>Ford</td>\
        <td>Focus</td>\
        <td>2013</td>\
        <td>20,000</td>\
      </tr>\
    </tbody>\
  </table>\
"

describe("Operations", () => {
  beforeEach(() => {
    $("#dynatable-spec").html(sortTable)
  })

  afterEach(() => {
    $("#dynatable-spec").html("")
    window.history.state.dynatable = null
  })

  it("sorts table by column headers", () => {
    $("#sorting-example").dynatable()

    let modelColumnHeader = $("#sorting-example th[data-dynatable-column='model'] a")

    modelColumnHeader.click()

    let records = window.history.state.dynatable.dataset.records

    expect(records[0].model).toBe("Cooper")
    expect(records[1].model).toBe("Escape")
    expect(records[2].model).toBe("Focus")
    expect(records[3].model).toBe("Focus SVT")
    expect(records[4].model).toBe("Jetta Wolfsburg")

    modelColumnHeader.click()

    records = window.history.state.dynatable.dataset.records

    expect(records[4].model).toBe("Cooper")
    expect(records[3].model).toBe("Escape")
    expect(records[2].model).toBe("Focus")
    expect(records[1].model).toBe("Focus SVT")
    expect(records[0].model).toBe("Jetta Wolfsburg")

    modelColumnHeader.click()

    let makeColumnHeader = $("#sorting-example th[data-dynatable-column='make'] a")

    makeColumnHeader.click()

    records = window.history.state.dynatable.dataset.records

    expect(records[0].make).toBe("<img>Ford")
    expect(records[1].make).toBe("<img>Ford")
    expect(records[2].make).toBe("<img>Ford")
    expect(records[3].make).toBe("<img>Mini")
    expect(records[4].make).toBe("<img alt=\"won't affect sorting\">Volkswagen")

    makeColumnHeader.click()

    records = window.history.state.dynatable.dataset.records

    expect(records[4].make).toBe("<img>Ford")
    expect(records[3].make).toBe("<img>Ford")
    expect(records[2].make).toBe("<img>Ford")
    expect(records[1].make).toBe("<img>Mini")
    expect(records[0].make).toBe("<img alt=\"won't affect sorting\">Volkswagen")

    makeColumnHeader.click()

    let yearColumnHeader = $("#sorting-example th[data-dynatable-column='year'] a")

    yearColumnHeader.click()

    records = window.history.state.dynatable.dataset.records

    expect(records[0].year).toBe("2001")
    expect(records[1].year).toBe("2001")
    expect(records[2].year).toBe("2003")
    expect(records[3].year).toBe("2008")
    expect(records[4].year).toBe("2013")

    yearColumnHeader.click()

    records = window.history.state.dynatable.dataset.records

    expect(records[4].year).toBe("2001")
    expect(records[3].year).toBe("2001")
    expect(records[2].year).toBe("2003")
    expect(records[1].year).toBe("2008")
    expect(records[0].year).toBe("2013")

    yearColumnHeader.click()
  })
})
