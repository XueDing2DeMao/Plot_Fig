#include <origin.h>

// GetFormat reads raw properties. Refuse executable properties before AddPlot,
// rescaling or destroying a loaded graph; the host terminates the owned process.
bool plot_fig_native_is_inert(TreeNode& node, int depth = 0, bool isStyleHolder = false)
{
    if (depth > 48) return false;
    foreach (TreeNode child in node.Children)
    {
        if (child.Children.Count() > 0)
        {
            if (!plot_fig_native_is_inert(child, depth + 1, isStyleHolder)) return false;
            continue;
        }
        string name = child.tagName;
        name.MakeLower();
        string value = child.strVal;
        value.TrimLeft();
        value.TrimRight();
        if ((name.Find("script") >= 0 || name.Find("formula") >= 0
            || name.Find("function") >= 0 || name.Find("expression") >= 0)
            && !value.IsEmpty())
        {
            // StyleHolder inherits GraphObject and stores the X designation in
            // its Script field. This exact internal sentinel is not executable.
            if (!(isStyleHolder && name == "script" && value == "X")) return false;
        }
        if (name == "text")
        {
            // Allow only the built-in axis and numeric legend placeholders.
            // Multiple legend entries are valid; arbitrary expressions are not.
            if (value.Find("$(") >= 0) return false;
            int position = 0;
            while ((position = value.Find("%(", position)) >= 0)
            {
                int end = value.Find(")", position + 2);
                if (end < 0) return false;
                string token = value.Mid(position + 2, end - position - 2);
                if (token != "?X" && token != "?Y" && token != "?Z")
                {
                    if (token.IsEmpty()) return false;
                    for (int character = 0; character < token.GetLength(); character++)
                    {
                        if (token.GetAt(character) < '0' || token.GetAt(character) > '9') return false;
                    }
                }
                position = end + 1;
            }
        }
    }
    return true;
}

// Only this trusted entry point is invoked. Template paths are COM string values,
// never interpolated into LabTalk code. Graph object scripts are disabled.
int plot_fig_native_read()
{
    char inputBuffer[4096], outputBuffer[4096];
    if (!LT_get_str("plotFigInput$", inputBuffer, 4096)
        || !LT_get_str("plotFigOutputDirectory$", outputBuffer, 4096)) return 10;
    string input = inputBuffer;
    string directory = outputBuffer;
    int flags = CREATE_HIDDEN | CREATE_NO_GUI_ACCESS | CREATE_NO_RUN_GR_SCRIPT
        | CREATE_NO_APPLY_SYSTEM_THEME | CREATE_NO_DEFAULT_TEMPLATE | CREATE_KEEP_LAYER_NAMES;
    GraphPage graph;
    if (!graph.Create(input, flags)) return 11;
    if (graph.Layers.Count() > 32) return 12;
    Tree manifest;
    manifest.LayerCount.nVal = graph.Layers.Count();
    Tree pageFormat;
    pageFormat = graph.GetFormat(FPB_ALL, FOB_ALL, TRUE, TRUE);
    if (!plot_fig_native_is_inert(pageFormat)) return 18;
    foreach (GraphLayer checkLayer in graph.Layers)
    {
        foreach (GraphObject object in checkLayer.GraphObjects)
        {
            bool isStyleHolder = false;
            foreach (StyleHolder holder in checkLayer.StyleHolders)
            {
                if (holder.GetName() == object.GetName()) { isStyleHolder = true; break; }
            }
            Tree objectFormat;
            objectFormat = object.GetFormat(FPB_ALL, FOB_ALL, TRUE, TRUE);
            if (!plot_fig_native_is_inert(objectFormat, 0, isStyleHolder)) return 18;
        }
    }
    if (!pageFormat.Save(directory + "page.xml")) { graph.Destroy(); return 13; }
    int layerIndex = 0, totalStyles = 0;
    foreach (GraphLayer layer in graph.Layers)
    {
        int styleCount = layer.StyleHolders.Count();
        totalStyles += styleCount;
        if (totalStyles > 128) { graph.Destroy(); return 14; }
        string layerNumber;
        layerNumber.Format("%d", layerIndex);
        TreeNode layerInfo;
        layerInfo = manifest.AddNode("Layer" + layerNumber);
        layerInfo.Name.strVal = layer.GetName();
        layerInfo.StyleCount.nVal = styleCount;
        Tree layerFormat;
        layerFormat = layer.GetFormat(FPB_ALL, FOB_ALL, TRUE, TRUE);
        if (!layerFormat.Save(directory + "layer-" + layerNumber + ".xml"))
        { graph.Destroy(); return 15; }
        // Keep styles on the original template. Remove each synthetic worksheet
        // after its plot format has been exported, so no data becomes a binding.
        for (int styleIndex = 0; styleIndex < styleCount; styleIndex++)
        {
            StyleHolder style = layer.StyleHolders(styleIndex);
            int plotId = style.GetPlotId();
            string styleNumber;
            styleNumber.Format("%d", styleIndex);
            TreeNode styleInfo;
            styleInfo = layerInfo.AddNode("Style" + styleNumber);
            styleInfo.PlotId.nVal = plotId;
            styleInfo.Designations.strVal = style.GetPlotDesignations();
            styleInfo.Materialized.nVal = 0;
            if (!(plotId == 200 || plotId == 201 || plotId == 202 || plotId == 203
                || plotId == 204 || plotId == 213 || plotId == 214
                || plotId == 215 || plotId == 216)) continue;
            Worksheet synthetic;
            if (!synthetic.Create(NULL, flags)) { graph.Destroy(); return 16; }
            synthetic.SetSize(2, 2);
            Dataset x(synthetic, 0), y(synthetic, 1);
            x.Data(0, 1);
            y.Data(1, 2);
            Curve curve(synthetic, 0, 1);
            int plotIndex = layer.AddPlot(curve, style);
            if (plotIndex >= 0)
            {
                DataPlot plot = layer.DataPlots(plotIndex);
                Tree plotFormat;
                plotFormat = plot.GetFormat(FPB_ALL, FOB_ALL, TRUE, TRUE);
                if (!plot_fig_native_is_inert(plotFormat)) return 18;
                if (plotFormat.Save(directory + "plot-" + layerNumber + "-" + styleNumber + ".xml"))
                    styleInfo.Materialized.nVal = 1;
            }
            WorksheetPage syntheticPage = synthetic.GetPage();
            syntheticPage.Destroy();
        }
        layerIndex++;
    }
    BOOL saved = manifest.Save(directory + "manifest.xml");
    graph.Destroy();
    return saved ? 0 : 17;
}

int plot_fig_native_color(double color)
{
    return okutil_convert_ocolor_to_RGB((OCOLOR)color);
}

int plot_fig_native_font(double face)
{
    int index = FontFaceDWORD_to_Index((DWORD)face);
    if (index < 0) return 1;
    string name = GetFontNameByIndex(index);
    if (name.IsEmpty()) return 2;
    LT_set_str("plotFigFont$", name);
    return 0;
}
