#include <origin.h>

// Test-only: construct two harmless event fixtures in a new hidden Origin process.
// The marker command is stored as text, never deliberately executed by the test.
int plot_fig_make_script_fixtures()
{
    char inputBuffer[4096], outputBuffer[4096];
    LT_get_str("plotFigFixtureSource$", inputBuffer, 4096);
    LT_get_str("plotFigFixtureDirectory$", outputBuffer, 4096);
    string directory = outputBuffer;
    GraphPage graph;
    int flags = CREATE_HIDDEN | CREATE_NO_GUI_ACCESS | CREATE_NO_RUN_GR_SCRIPT
        | CREATE_NO_APPLY_SYSTEM_THEME | CREATE_NO_DEFAULT_TEMPLATE;
    if (!graph.Create(inputBuffer, flags)) return 1;
    GraphLayer layer = graph.Layers(0);
    Worksheet sheet;
    if (!sheet.Create(NULL, flags)) return 6;
    sheet.SetSize(2, 3);
    Dataset x(sheet, 0), y1(sheet, 1), y2(sheet, 2);
    x.Data(0, 1); y1.Data(1, 2); y2.Data(2, 3);
    Curve curve1(sheet, 0, 1), curve2(sheet, 0, 2);
    StyleHolder style = layer.StyleHolders(0);
    int firstIndex = layer.AddPlot(curve1, style);
    int secondIndex = layer.AddPlot(curve2, style);
    if (firstIndex < 0 || secondIndex < 0) return 7;
    DataPlot first = layer.DataPlots(firstIndex), second = layer.DataPlots(secondIndex);
    Tree firstFormat, secondFormat;
    firstFormat = first.GetFormat(FPB_ALL, FOB_ALL, TRUE, TRUE);
    secondFormat = second.GetFormat(FPB_ALL, FOB_ALL, TRUE, TRUE);
    firstFormat.Root.Line.Color.nVal = RGB2OCOLOR(RGB(255, 0, 0));
    firstFormat.Root.Line.Style.nVal = 0;
    secondFormat.Root.Line.Color.nVal = RGB2OCOLOR(RGB(0, 0, 255));
    secondFormat.Root.Line.Style.nVal = 1;
    if (!first.ApplyFormat(firstFormat, FALSE, TRUE) || !second.ApplyFormat(secondFormat, FALSE, TRUE)) return 8;
    if (!graph.SaveTemplate(directory + "multiple.otpu")) return 9;
    GraphObject legend = layer.GraphObjects("Legend");
    Tree format;
    format = legend.GetFormat(FPB_ALL, FOB_ALL, TRUE, TRUE);
    format.Root.Script.strVal = "type -o save \"" + directory + "marker.txt\";";
    format.Root.Event.nVal = GRCT_WINCREATE;
    if (!legend.ApplyFormat(format, FALSE, TRUE)) return 10;
    Tree actual;
    actual = legend.GetFormat(FPB_ALL, FOB_ALL, TRUE, TRUE);
    string script = actual.Root.Script.strVal;
    if (script.IsEmpty()) return 2;
    if (!actual.Save(directory + "script-evidence.xml")) return 3;
    if (!graph.SaveTemplate(directory + "create.otpu")) return 4;
    format.Root.Event.nVal = GRCT_WINCLOSE;
    if (!legend.ApplyFormat(format, FALSE, TRUE)) return 11;
    if (!graph.SaveTemplate(directory + "close.otpu")) return 5;
    // Do not graph.Destroy or Application.Exit: that would dispatch the close event.
    return 0;
}
