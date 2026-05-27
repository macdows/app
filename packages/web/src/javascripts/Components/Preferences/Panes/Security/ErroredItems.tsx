import { observer } from 'mobx-react-lite'
import { Fragment, FunctionComponent, useEffect, useState } from 'react'
import { Text, Title, Subtitle } from '@/Components/Preferences/PreferencesComponents/Content'
import { ButtonType, ClientDisplayableError, ContentType, EncryptedItemInterface } from '@standardnotes/snjs'
import Button from '@/Components/Button/Button'
import HorizontalSeparator from '@/Components/Shared/HorizontalSeparator'
import PreferencesSegment from '../../PreferencesComponents/PreferencesSegment'
import PreferencesGroup from '../../PreferencesComponents/PreferencesGroup'
import { ErrorCircle } from '@/Components/UIElements/ErrorCircle'
import { useApplication } from '@/Components/ApplicationProvider'
import { c, msgid, ngettext } from 'ttag'

const ErroredItems: FunctionComponent = () => {
  const application = useApplication()
  const [erroredItems, setErroredItems] = useState(application.items.invalidNonVaultedItems)

  useEffect(() => {
    return application.items.streamItems(ContentType.TYPES.Any, () => {
      setErroredItems(application.items.invalidNonVaultedItems)
    })
  }, [application])

  const getContentTypeDisplay = (item: EncryptedItemInterface): string => {
    const contentTypeOrError = ContentType.create(item.content_type)
    let display = null
    if (!contentTypeOrError.isFailed()) {
      display = contentTypeOrError.getValue().getDisplayName()
    }
    if (display) {
      return `${display[0].toUpperCase()}${display.slice(1)}`
    } else {
      return c('Info').t`Item of type ${item.content_type}`
    }
  }

  const deleteItem = async (item: EncryptedItemInterface): Promise<void> => {
    return deleteItems([item])
  }

  const deleteItems = async (items: EncryptedItemInterface[]): Promise<void> => {
    const itemCount = items.length
    const confirmed = await application.alerts.confirm(
      ngettext(
        msgid`Are you sure you want to permanently delete ${itemCount} item?`,
        `Are you sure you want to permanently delete ${itemCount} items?`,
        itemCount,
      ),
      undefined,
      c('Action').t`Delete`,
      ButtonType.Danger,
    )
    if (!confirmed) {
      return
    }

    void application.mutator.deleteItems(items).then(() => {
      void application.sync.sync()
    })

    setErroredItems(application.items.invalidItems)
  }

  const attemptDecryption = (item: EncryptedItemInterface): void => {
    const errorOrTrue = application.canAttemptDecryptionOfItem(item)

    if (errorOrTrue instanceof ClientDisplayableError) {
      void application.alerts.showErrorAlert(errorOrTrue)

      return
    }

    application.presentKeyRecoveryWizard()
  }

  if (erroredItems.length === 0) {
    return null
  }

  return (
    <PreferencesGroup>
      <PreferencesSegment>
        <Title className="flex flex-row items-center gap-2">
          <ErrorCircle />
          {c('Title').t`Error decrypting items`}
        </Title>
        <Text>
          {ngettext(
            msgid`${erroredItems.length} item is errored and could not be decrypted.`,
            `${erroredItems.length} items are errored and could not be decrypted.`,
            erroredItems.length,
          )}
        </Text>
        <div className="flex">
          <Button
            className="mr-2 mt-3 min-w-20"
            label={c('Action').t`Export all`}
            onClick={() => {
              void application.archiveService.downloadEncryptedItems(erroredItems)
            }}
          />
          <Button
            className="mr-2 mt-3 min-w-20"
            colorStyle="danger"
            label={c('Action').t`Delete all`}
            onClick={() => {
              void deleteItems(erroredItems)
            }}
          />
        </div>
        <HorizontalSeparator classes="mt-2.5 mb-3" />

        {erroredItems.map((item, index) => {
          return (
            <Fragment key={item.uuid}>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <Subtitle>
                    {c('Subtitle').t`${getContentTypeDisplay(item)} created on ${item.createdAtString}`}
                  </Subtitle>
                  <Text>{c('Info').t`Item ID: ${item.uuid}`}</Text>
                  <Text>{c('Info').t`Last Modified: ${item.updatedAtString}`}</Text>
                  <div className="flex">
                    <Button
                      className="mr-2 mt-3 min-w-20"
                      label={c('Action').t`Attempt decryption`}
                      onClick={() => {
                        attemptDecryption(item)
                      }}
                    />
                    <Button
                      className="mr-2 mt-3 min-w-20"
                      label={c('Action').t`Export`}
                      onClick={() => {
                        void application.archiveService.downloadEncryptedItem(item)
                      }}
                    />
                    <Button
                      className="mr-2 mt-3 min-w-20"
                      colorStyle="danger"
                      label={c('Action').t`Delete`}
                      onClick={() => {
                        void deleteItem(item)
                      }}
                    />
                  </div>
                </div>
              </div>
              {index < erroredItems.length - 1 && <HorizontalSeparator classes="mt-2.5 mb-3" />}
            </Fragment>
          )
        })}
      </PreferencesSegment>
    </PreferencesGroup>
  )
}

export default observer(ErroredItems)
