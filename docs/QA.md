TODO: Move to wiki

# QA Process

<details><summary>New comment</summary>

<details><summary>New comment / Show the widget</summary>

* Do: Open a pull request
* Do: Hover a line of code
* Expect: Github's regular Add Comment button is shown
* Expect: The plugin's Add Comment button is shown next to it
* Do: Click the plugin's Add Comment button
* Expect: The plugin's Edit Comment widget is shown between the line and the next line
* Expect: The Write tab to be open
* Expect: A text area to be shown
* Expect: The text area to be focused
* Expect: A Cancel and OK button to be shown
</details>

<details><summary>New comment / Show the widget / Preview</summary>

* Do: Enter markdown into the text area
* Do: Click the Preview tab
* Expect: The Write tab to be hidden
* Expect: A rendered version of the markdown to be shown
* Do: Click the Write tab
* Expect: The Preview tab to be hidden
* Expect: The Write tab to be shown with unrendered text
</details>

<details><summary>New comment / Show the widget / Save</summary>

* Do: Enter markdown into the text area
* Do: Click the OK button
* Expect: The Preview tab to be shown
* Expect: The comment to be saved
</details>

<details><summary>New comment / Show the widget / Cancel</summary>

* Do: Enter markdown into the text area
* Do: Click the Cancel button
* Expect: The Edit Comment widget to no longer be shown
* Expect: The comment not to be saved
</details>

</details>

<details><summary>Existing comment</summary>

* Setup: A pull request has a comment saved
* Do: Open a pull request

<details><summary>Existing comment / Show the widget</summary>

* Expect: The Edit Comment widget to be shown
* Expect: The Preview tab to be shown
* Expect: A rendered version of the markdown to be shown
</details>

<details><summary>Existing comment / Show the widget / Save</summary>

* See: New comment / Show the widget / Save
</details>

<details><summary>New comment / Show the widget / Cancel</summary>

* Do: Change the markdown in the text area
* Do: Click the Cancel button
* Expect: The Preview tab to be shown
* Expect: The original comment's markdown to be rendered
* Expect: The modified comment not to be saved
</details>

</details>
