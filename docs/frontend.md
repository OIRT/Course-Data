# How the Frontend Works

Some of the display code is a bit weird, so I'll try to explain how it all fits together.

## HTML

At the moment, the frontend begins in `userLookup.html`. This pulls in all of the necessary CSS and Javascript to get the ball rolling, in addition to setting up a few of the dialogs. The HTML is minimal here, as much of the display code gets rendered from `.ejs` templates or inserted by DataTables.

Everything the user does goes through this one HTML file. There are no other views.

## CSS

I'm using SASS as a layer on top of CSS. This is primarily to take advantage of being able to split the CSS across multiple files, while having it compile down to only one, although I also use some color variables and extenders occasionally.

## Javascript

All of the javascript that isn't for the various plugins I utilize is in `query.js`.

Most of the data used by the javascript gets stored in a single global variable, `CourseData`. This is where all of the workspace information, the DataTables instance, and a few other pieces of data go.

Most of the code here doesn't execute until after the DataTables instance is loaded. Once the table loads all of its data (via Ajax, in `fetchTable()`), it calls `tableInitialized()`, which grabs the current workspace object and finishes up formatting all of the data in the table to match the view saved in the workspace.

### Populating the Table

The table is initially populated via JSON, where information about the column headers is stored in an `aoColumns` property, and information about the rows is stored in an `aaData` property. This data is fed directly from the backend.

### Controllers

As part of its execution, this function configures a few CanJS controllers:

- `FiltersControl`: Keeps track of the list of filters at the top of the page.
- `AndVOrControl`: Controls the little "all" vs. "any" dropdown at the top, which controls whether the filter comparison is an "and" operation or an "or" operation.
- `ColumnsControl`: Goes about putting the columns in the correct order (as per the workspace), setting their initial visibility (future visibility is controlled by `VisControl`), and watching for reorder and sort events.
- `VisControl`: Sets column visibility based on the Show/Hide Columns dialog.

### Rendering Templates

Most of the controllers listed above use CanJS to render `.ejs` templates. These allow the javascript to generate and insert HTML into the page, without cryptically embedding it within the javascript. There are several:

- `andVor.ejs`: Renders the small dropdown at the top.
- `filterList.ejs`: Creates one filter row for each filter in the workspace. Calls `filterView.ejs` to generate each individual filter.
- `filterView.ejs`: Generates everything about the filter with the exception of the main column selection dropdown, which is done in its own template.
- `filterSelect.ejs`: Renders the column selection dropdown. This is abstracted away from the rest of the filter information because it is needed for the MarkItUp editor to fill variables into e-mails.


### Auto-Updating the Workspace

The javascript carefully watches for any change to the workspace object (performed through `.attr()`). When it catches one, it executes `CourseData.postWorkspace()`.

This function is a bit odd in that it doesn't immediately push the updated workspace object to the server. Instead, it sets a timer several seconds in the future, and a monitor that will wait for this timer to be reached. Once the timer is reached, it pushes the workspace to the server.

The next time the function is called, if the original timer hasn't been reached yet, it pushes that timer further into the future, and doesn't establish a new monitor.

Effectively, this ensures that multiple requests aren't done needlessly too close together. The concern is that a user moving around a lot of columns, or adding a few new filters, will generate dozens of requests, all in a very brief period of time. This consolidates all of that into a single request.

### Sending E-Mails

The E-Mail dialog uses a variation on the MarkItUp! in-browser editor. I've taken out most of the HTML editing buttons, and added a dropdown and button for inserting variables.

When the send mail button is pressed, the frontend submits a request to the server that contains a list of all of the rcpids of users that should be e-mailed, in addition to the template that should be used to render the e-mail.

Before actually sending the e-mails, the front-end requests a preview, at which point the back-end sends back a single (rendered) e-mail.

### Column Data Type

The data type for each column is important for sorting and filtering. It is initially determined by sampling the first non-empty entry for that column in one of the rows. If the entry contains any letters, it's determined to be a `string` type, else it's considered a `course-numeric`.