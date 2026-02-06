import { useState, useEffect, useMemo } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import {
  Badge,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/library';
import { cn } from '@/library';
import { api } from '../../lib/api';
import type { Spec } from '../../types/api';
import { useTranslation } from 'react-i18next';
import { useInvalidateSpecs } from '../../hooks/useSpecsQuery';

interface TagsEditorProps {
  specName: string;
  value: Spec['tags'];
  onChange?: (tags: string[]) => void;
  expectedContentHash?: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

export function TagsEditor({
  specName,
  value,
  onChange,
  expectedContentHash,
  disabled = false,
  className,
  compact = false,
}: TagsEditorProps) {
  const [tags, setTags] = useState<string[]>(value || []);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const { t } = useTranslation('common');
  const invalidateSpecs = useInvalidateSpecs();

  // Fetch all available tags for autocomplete when popover opens
  useEffect(() => {
    if (isOpen && allTags.length === 0) {
      const fetchTags = async () => {
        try {
          const specs = await api.getSpecs();
          const uniqueTags = new Set<string>();
          specs.forEach(s => s.tags?.forEach(t => uniqueTags.add(t)));
          setAllTags(Array.from(uniqueTags).sort());
        } catch (err) {
          console.error('Failed to fetch tags:', err);
        }
      };
      void fetchTags();
    }
  }, [isOpen, allTags.length]);

  const updateTags = async (newTags: string[]) => {
    const previousTags = tags;
    setTags(newTags); // Optimistic update
    setIsUpdating(true);
    setError(null);

    try {
      await api.updateSpec(specName, { tags: newTags, expectedContentHash });
      onChange?.(newTags);
      invalidateSpecs();
    } catch (err) {
      setTags(previousTags); // Rollback
      const errorMessage = err instanceof Error ? err.message : t('editors.tagsError');
      setError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim(); // Don't lowercase automatically to preserve user intent, or follow project convention
    if (!trimmedTag) return;
    if (tags.includes(trimmedTag)) {
      setError(t('editors.tagExists'));
      return;
    }

    const newTags = [...tags, trimmedTag];
    void updateTags(newTags);
    setSearchValue('');
    setIsOpen(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    void updateTags(newTags);
  };

  // Filter available tags: show tags that aren't already added and match search
  const availableTags = useMemo(() => {
    const lowercaseSearch = searchValue.toLowerCase();
    return allTags
      .filter(tag => !tags.includes(tag))
      .filter(tag => !lowercaseSearch || tag.toLowerCase().includes(lowercaseSearch));
  }, [allTags, tags, searchValue]);

  // Check if search value could be a new tag (not in available tags)
  const canCreateNewTag = searchValue.trim() &&
    !tags.includes(searchValue.trim()) &&
    !allTags.includes(searchValue.trim());

  const MAX_VISIBLE_TAGS = 3;
  const visibleTags = compact && tags.length > MAX_VISIBLE_TAGS ? tags.slice(0, MAX_VISIBLE_TAGS) : tags;
  const hiddenTagsCount = tags.length - visibleTags.length;

  const renderTag = (tag: string) => (
    <Badge
      key={tag}
      variant="outline"
      className={cn(
        "text-xs pr-1 gap-1",
        disabled && "opacity-50"
      )}
    >
      {tag}
      {!disabled && (
        <button
          onClick={() => handleRemoveTag(tag)}
          disabled={isUpdating}
          className="ml-1 rounded-full hover:bg-muted p-0.5 transition-colors"
          aria-label={t('editors.removeTag', { tag })}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );

  return (
    <div className={cn("relative", className)}>
      <div className="flex gap-1 flex-wrap items-center">
        {visibleTags.map(renderTag)}

        {hiddenTagsCount > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Badge variant="outline" className="cursor-pointer hover:bg-muted h-6 px-2 text-xs">
                +{hiddenTagsCount}
              </Badge>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="flex flex-wrap gap-1">
                {tags.map(renderTag)}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {!disabled && (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs"
                disabled={isUpdating}
                aria-label={t('editors.addTag')}
              >
                {isUpdating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="start">
              <Command>
                <CommandInput
                  placeholder={t('editors.searchTag')}
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
                <CommandList>
                  <CommandEmpty>
                    {canCreateNewTag ? (
                      <CommandItem
                        onSelect={() => handleAddTag(searchValue)}
                        className="cursor-pointer"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {t('editors.createTag', { tag: searchValue.trim() })}
                      </CommandItem>
                    ) : (
                      <span className="text-muted-foreground px-2 py-1.5 text-sm">
                        {t('editors.noTagResults')}
                      </span>
                    )}
                  </CommandEmpty>
                  {availableTags.length > 0 && (
                    <CommandGroup heading={t('editors.existingTags')}>
                      {availableTags.slice(0, 10).map((tag) => (
                        <CommandItem
                          key={tag}
                          value={tag}
                          onSelect={() => handleAddTag(tag)}
                          className="cursor-pointer"
                        >
                          {tag}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {canCreateNewTag && availableTags.length > 0 && (
                    <CommandGroup heading={t('editors.createSection')}>
                      <CommandItem
                        onSelect={() => handleAddTag(searchValue)}
                        className="cursor-pointer"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {t('editors.createTag', { tag: searchValue.trim() })}
                      </CommandItem>
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
              {error && (
                <p className="text-xs text-destructive px-2 pb-2">{error}</p>
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
