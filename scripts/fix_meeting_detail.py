import re

path = "/home/ubuntu/sales-notetaker/client/src/pages/MeetingDetail.tsx"
with open(path) as f:
    content = f.read()

replacements = [
    # isProcessing line
    (
        "generateAnalysisMutation.isPending || generateSpicedMutation.isPending || generateMeddpiccMutation.isPending",
        "generateAllMutation.isPending"
    ),
    # mutateAsync calls inside the generate all button
    (
        "await generateAnalysisMutation.mutateAsync({ meetingId });\n                  await generateSpicedMutation.mutateAsync({ meetingId });\n                  await generateMeddpiccMutation.mutateAsync({ meetingId });",
        "await generateAllMutation.mutateAsync({ meetingId });"
    ),
    # onGenerate for analysis tab
    (
        "onGenerate={hasTranscript ? () => generateAnalysisMutation.mutate({ meetingId }) : undefined}",
        "onGenerate={hasTranscript ? () => generateAllMutation.mutate({ meetingId }) : undefined}"
    ),
    (
        "isGenerating={generateAnalysisMutation.isPending}",
        "isGenerating={generateAllMutation.isPending}"
    ),
    # inline generate button in analysis tab
    (
        "onClick={() => generateAnalysisMutation.mutate({ meetingId })}",
        "onClick={() => generateAllMutation.mutate({ meetingId })}"
    ),
    (
        "disabled={generateAnalysisMutation.isPending}",
        "disabled={generateAllMutation.isPending}"
    ),
    (
        "{generateAnalysisMutation.isPending ? <Loader2 className=\"w-3 h-3 animate-spin\" /> : <Zap className=\"w-3 h-3\" />}",
        "{generateAllMutation.isPending ? <Loader2 className=\"w-3 h-3 animate-spin\" /> : <Zap className=\"w-3 h-3\" />}"
    ),
    # SPICED tab generate
    (
        "isGenerating={generateSpicedMutation.isPending}",
        "isGenerating={generateAllMutation.isPending}"
    ),
    (
        "onGenerate={() => generateSpicedMutation.mutate({ meetingId })}",
        "onGenerate={() => generateAllMutation.mutate({ meetingId })}"
    ),
    # MEDDPICC tab generate
    (
        "isGenerating={generateMeddpiccMutation.isPending}",
        "isGenerating={generateAllMutation.isPending}"
    ),
    (
        "onGenerate={() => generateMeddpiccMutation.mutate({ meetingId })}",
        "onGenerate={() => generateAllMutation.mutate({ meetingId })}"
    ),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        print(f"✅ Replaced: {old[:60]}...")
    else:
        print(f"⚠️  Not found: {old[:60]}...")

with open(path, "w") as f:
    f.write(content)

print("Done.")
