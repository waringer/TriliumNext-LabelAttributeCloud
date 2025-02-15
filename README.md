# TriliumNext Notes Label Attribute Cloud Widget
Show Label Attributes for books as a tag cloud with search and filter options on the right

Written for TrilliumNext Notes v0.91.6

## How to install
* Create a code note of type JS frontend and give it a #widget label 
* Copy the text of code.js in it
* Reload or restart Trillium

## Using
To activate the widget add the attribute #showCloud to the book you want to show the tag cloud on the right.

* If you prefer not to see the count for the attributes you can set the variable "CloudShowCount" to false
* To change the default sorting of the cloud from sort by name to sort by weigth change the variable "CloudDefaultSortAttributeByWeight" to true
* To hide a attribute in the cloud add it to the variable "CloudIgnoredAttributes"
